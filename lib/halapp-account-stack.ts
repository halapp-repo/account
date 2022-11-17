import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, LogLevel } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import getConfig from "../config";
import { BuildConfig } from "./build-config";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

export class HalappAccountStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    //*****************
    // BUILD CONFIG
    //******************
    const buildConfig = getConfig(scope as cdk.App);

    //************
    // Import Email Template Bucket
    //************
    const importedEmailTemplateBucket = s3.Bucket.fromBucketName(
      this,
      `imported-hal-email-template-${this.account}`,
      `hal-email-template-${this.account}`
    );
    // *************
    // Create SNS (Organization Created)
    // *************
    const organizationCreatedTopic = this.createSNSTopic(buildConfig);
    // **************
    // Create AccountDB
    // **************
    const accountDB = this.createAccountTable();
    // **************
    // Create SQS (User Created)
    // ****************
    const userCreatedSQS = this.createUserCreatedQueue(buildConfig);

    // ********************
    // Create API Gateway
    // ********************
    const accountApi = this.createAccountApiGateway();
    const organizationsResource = accountApi.root.addResource("organizations");
    const organizationsEnrollmentResource =
      organizationsResource.addResource("enrollment");

    this.createOrganizationEnrollmentHandler(
      organizationsEnrollmentResource,
      organizationCreatedTopic,
      accountDB,
      importedEmailTemplateBucket,
      buildConfig
    );
    this.userCreatedHandler(userCreatedSQS, accountDB, buildConfig);
  }
  createAccountApiGateway(): cdk.aws_apigateway.RestApi {
    const accountApi = new apigateway.RestApi(this, "HalAppAccountApi", {
      description: "HalApp Account Api Gateway",
    });
    return accountApi;
  }
  createOrganizationEnrollmentHandler(
    organizationsEnrollmentResource: cdk.aws_apigateway.Resource,
    organizationCreatedTopic: cdk.aws_sns.Topic,
    accountDB: cdk.aws_dynamodb.Table,
    importedEmailTemplateBucket: cdk.aws_s3.IBucket,
    buildConfig: BuildConfig
  ): cdk.aws_lambda_nodejs.NodejsFunction {
    // ***************************
    // Create Lambda Handler
    // ***************************
    organizationsEnrollmentResource.addCorsPreflight({
      allowHeaders: [
        "Content-Type",
        "X-Amz-Date",
        "Authorization",
        "X-Api-Key",
      ],
      allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
      allowCredentials: true,
      allowOrigins: ["*"],
    });
    const organizationsEnrollmentHandler = new NodejsFunction(
      this,
      "AccountOrganizationEnrollmentHandler",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_16_X,
        functionName: "AccountOrganizationEnrollmentHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(15),
        entry: path.join(
          __dirname,
          `/../src/handlers/account-post-organizations-enrollment-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          Region: buildConfig.Region,
          AccountDB: accountDB.tableName,
          S3BucketName: importedEmailTemplateBucket.bucketName,
          SESFromEmail: buildConfig.SESFromEmail,
          SESCCEmail: buildConfig.SESCCEmail,
          EmailTemplate: buildConfig.S3OrganizationEnrollmentEmailTemplate,
          SNSOrganizationCreatedTopicArn: organizationCreatedTopic.topicArn,
        },
      }
    );
    organizationsEnrollmentResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(organizationsEnrollmentHandler, {
        proxy: true,
      })
    );
    organizationsEnrollmentHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );
    importedEmailTemplateBucket.grantRead(organizationsEnrollmentHandler);
    accountDB.grantReadWriteData(organizationsEnrollmentHandler);
    organizationCreatedTopic.grantPublish(organizationsEnrollmentHandler);
    return organizationsEnrollmentHandler;
  }
  createAccountTable(): cdk.aws_dynamodb.Table {
    const accountTable = new dynamodb.Table(this, "HalAccountDB", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "HalAccount",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      partitionKey: {
        name: "AccountID",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "TS",
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecovery: true,
    });
    accountTable.addGlobalSecondaryIndex({
      indexName: "VKNIndex",
      partitionKey: {
        name: "VKN",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    accountTable.addGlobalSecondaryIndex({
      indexName: "EmailIndex",
      partitionKey: {
        name: "Email",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    return accountTable;
  }
  createSNSTopic(buildConfig: BuildConfig): cdk.aws_sns.Topic {
    const organizationCreatedTopic = new sns.Topic(
      this,
      "OrganizationCreatedTopic",
      {
        displayName: "OrganizationCreatedTopic",
      }
    );
    const importedOrganizationCreatedQueue = sqs.Queue.fromQueueArn(
      this,
      "ImportedOrganizationCreatedQueue",
      buildConfig.SQSOrganizationCreatedQueueArn
    );
    if (!importedOrganizationCreatedQueue) {
      throw new Error("ImportedOrganizationCreatedQueue was not imported");
    }
    organizationCreatedTopic.addSubscription(
      new subs.SqsSubscription(importedOrganizationCreatedQueue)
    );
    return organizationCreatedTopic;
  }
  createUserCreatedQueue(buildConfig: BuildConfig): cdk.aws_sqs.Queue {
    const userCreatedDLQ = new sqs.Queue(this, "Auth-UserCreatedDLQ", {
      queueName: "Auth-UserCreatedDLQ",
      retentionPeriod: cdk.Duration.hours(10),
    });
    const userCreatedQueue = new sqs.Queue(this, "Auth-UserCreatedQueue", {
      queueName: "Auth-UserCreatedQueue",
      visibilityTimeout: cdk.Duration.minutes(2),
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        queue: userCreatedDLQ,
        maxReceiveCount: 4,
      },
    });
    userCreatedQueue.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("sns.amazonaws.com")],
        actions: ["sqs:SendMessage"],
        resources: [userCreatedQueue.queueArn],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": this.account,
          },
          ArnLike: {
            // Allows all buckets to send notifications since we haven't created the bucket yet.
            "aws:SourceArn": "arn:aws:sns:*:*:*",
          },
        },
      })
    );
    const importedUserCreatedTopic = sns.Topic.fromTopicArn(
      this,
      "ImportedUserCreatedTopic",
      buildConfig.SNSUserCreatedTopicArn
    );
    if (!importedUserCreatedTopic) {
      throw new Error("ImportedUserCreatedTopic needs to come from auth");
    }
    importedUserCreatedTopic.addSubscription(
      new subs.SqsSubscription(userCreatedQueue)
    );
    return userCreatedQueue;
  }
  userCreatedHandler(
    userCreatedSQS: cdk.aws_sqs.Queue,
    accountDB: cdk.aws_dynamodb.Table,
    buildConfig: BuildConfig
  ): cdk.aws_lambda_nodejs.NodejsFunction {
    const userCreatedHandler = new NodejsFunction(
      this,
      "Account-SqsUserCreatedHandler",
      {
        memorySize: 1024,
        timeout: cdk.Duration.minutes(1),
        functionName: "Account-SqsUserCreatedHandler",
        runtime: lambda.Runtime.NODEJS_16_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          `/../src/handlers/user-created-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          AccountDB: accountDB.tableName,
        },
      }
    );
    userCreatedHandler.addEventSource(
      new SqsEventSource(userCreatedSQS, {
        batchSize: 1,
      })
    );
    accountDB.grantReadWriteData(userCreatedHandler);
    return userCreatedHandler;
  }
}
