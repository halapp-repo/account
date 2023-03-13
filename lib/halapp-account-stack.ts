import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apiGateway from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apiGatewayIntegrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, LogLevel } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as cognito from "aws-cdk-lib/aws-cognito";
import getConfig from "../config";
import { BuildConfig } from "./build-config";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apiGatewayAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";

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
    ///*************
    // Import Authorizer
    ///***************
    const authorizer = this.importAuthorizer(buildConfig);
    // *************
    // Create SNS (Organization Created)
    // *************
    const organizationCreatedTopic = this.createSNSTopic(buildConfig);
    // **************
    // Create AccountDB
    // **************
    const accountDB = this.createAccountTable(buildConfig);
    // **************
    // Create SQS (User Created)
    // ****************
    const userCreatedSQS = this.createUserCreatedQueue(buildConfig);
    // **************
    // Create SQS (Order Created)
    // ****************
    const orderSQS = this.createOrderQueue(buildConfig);
    // **************
    // Create SQS (User Joined Organization)
    // ****************
    const userJoinedOrganizationSQS =
      this.createUserJoinedOrganizationQueue(buildConfig);

    // ********************
    // Create API Gateway
    // ********************
    const accountApi = this.createAccountApiGateway();

    this.createOrganizationEnrollmentHandler(
      buildConfig,
      accountApi,
      organizationCreatedTopic,
      accountDB,
      importedEmailTemplateBucket
    );
    this.userCreatedHandler(buildConfig, userCreatedSQS, accountDB);
    this.userJoinedOrganizationHandler(
      buildConfig,
      userJoinedOrganizationSQS,
      accountDB
    );
    this.createOrderSQSHandler(buildConfig, orderSQS, accountDB);
    this.createGetOrganizationsHandler(
      buildConfig,
      accountApi,
      authorizer,
      accountDB
    );
    this.createAdminPutOrganizationToggleActivationHandler(
      buildConfig,
      accountApi,
      authorizer,
      accountDB
    );
    this.createAdminGetOrganizationsHandler(
      buildConfig,
      accountApi,
      authorizer,
      accountDB
    );
    this.createPutOrganizationUpdateHandler(
      buildConfig,
      accountApi,
      authorizer,
      accountDB
    );
    this.createPostOrganizationUpdateDeliveryAddressesHandler(
      buildConfig,
      accountApi,
      authorizer,
      accountDB
    );
    this.createGetOrganizationHandler(
      buildConfig,
      accountApi,
      authorizer,
      accountDB
    );
    this.createGetOrganizationUsersHandler(
      buildConfig,
      accountApi,
      authorizer,
      accountDB
    );
    this.createPostOrganizationUser(
      buildConfig,
      accountApi,
      authorizer,
      accountDB,
      organizationCreatedTopic
    );
  }
  createAccountApiGateway(): apiGateway.HttpApi {
    const accountApi = new apiGateway.HttpApi(this, "HalAppAccountApi", {
      description: "HalApp Account Api Gateway",
      corsPreflight: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
        ],
        allowMethods: [
          apiGateway.CorsHttpMethod.GET,
          apiGateway.CorsHttpMethod.HEAD,
          apiGateway.CorsHttpMethod.OPTIONS,
          apiGateway.CorsHttpMethod.POST,
          apiGateway.CorsHttpMethod.PUT,
          apiGateway.CorsHttpMethod.DELETE,
          apiGateway.CorsHttpMethod.PATCH,
        ],
        allowOrigins: ["*"],
      },
    });
    return accountApi;
  }
  createOrganizationEnrollmentHandler(
    buildConfig: BuildConfig,
    accountApi: apiGateway.HttpApi,
    organizationCreatedTopic: cdk.aws_sns.Topic,
    accountDB: cdk.aws_dynamodb.ITable,
    importedEmailTemplateBucket: cdk.aws_s3.IBucket
  ): cdk.aws_lambda_nodejs.NodejsFunction {
    // ***************************
    // Create Lambda Handler
    // ***************************
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
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
          S3BucketName: importedEmailTemplateBucket.bucketName,
          SESFromEmail: buildConfig.SESFromEmail,
          SESCCEmail: buildConfig.SESCCEmail,
          EmailTemplate: buildConfig.S3OrganizationEnrollmentEmailTemplate,
          SNSOrganizationCreatedTopicArn: organizationCreatedTopic.topicArn,
        },
      }
    );
    accountApi.addRoutes({
      methods: [HttpMethod.POST],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        "postOrganizationsEnrollmentIntegration",
        organizationsEnrollmentHandler
      ),
      path: "/organizations/enrollment",
    });
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
  createAccountTable(buildConfig: BuildConfig): cdk.aws_dynamodb.ITable {
    let accountTable;
    if (buildConfig.ShouldCreateDynamoAccountDB === false) {
      accountTable = dynamodb.Table.fromTableAttributes(this, "HalAccountDB", {
        tableName: buildConfig.AccountDBName,
        globalIndexes: ["VKNIndex", "EmailIndex"],
      });
    } else {
      accountTable = new dynamodb.Table(this, "HalAccountDB", {
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        tableName: buildConfig.AccountDBName,
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
    }
    return accountTable;
  }
  createSNSTopic(buildConfig: BuildConfig): cdk.aws_sns.Topic {
    const organizationCreatedTopic = new sns.Topic(
      this,
      "OrganizationCreatedTopic",
      {
        displayName: "OrganizationCreatedTopic",
        topicName: buildConfig.SNSOrganizationCreatedTopic,
      }
    );
    const importedOrganizationCreatedQueue = sqs.Queue.fromQueueArn(
      this,
      "ImportedOrganizationCreatedQueue",
      `arn:aws:sqs:${buildConfig.Region}:${buildConfig.AccountID}:${buildConfig.AUTH_SQSOrganizationCreatedQueue}`
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
      queueName: `${buildConfig.SQSUserCreatedQueue}DLQ`,
      retentionPeriod: cdk.Duration.hours(10),
    });
    const userCreatedQueue = new sqs.Queue(this, "Auth-UserCreatedQueue", {
      queueName: buildConfig.SQSUserCreatedQueue,
      visibilityTimeout: cdk.Duration.minutes(2),
      receiveMessageWaitTime: cdk.Duration.seconds(5),
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
            "aws:SourceArn": `arn:aws:sns:*:*:${buildConfig.AUTH_SNSUserCreatedTopic}`,
          },
        },
      })
    );
    const importedUserCreatedTopic = sns.Topic.fromTopicArn(
      this,
      "ImportedUserCreatedTopic",
      `arn:aws:sns:${buildConfig.Region}:${buildConfig.AccountID}:${buildConfig.AUTH_SNSUserCreatedTopic}`
    );
    if (!importedUserCreatedTopic) {
      throw new Error("ImportedUserCreatedTopic needs to come from auth");
    }
    importedUserCreatedTopic.addSubscription(
      new subs.SqsSubscription(userCreatedQueue)
    );
    return userCreatedQueue;
  }
  createUserJoinedOrganizationQueue(
    buildConfig: BuildConfig
  ): cdk.aws_sqs.Queue {
    const userJoinedOrganizationDLQ = new sqs.Queue(
      this,
      "Auth-UserJoinedOrganizationDLQ",
      {
        queueName: `${buildConfig.SQSUserJoinedOrganizationQueue}DLQ`,
        retentionPeriod: cdk.Duration.hours(10),
      }
    );
    const userJoinedOrganizationQueue = new sqs.Queue(
      this,
      "Auth-UserJoinedOrganizationQueue",
      {
        queueName: buildConfig.SQSUserJoinedOrganizationQueue,
        visibilityTimeout: cdk.Duration.minutes(2),
        receiveMessageWaitTime: cdk.Duration.seconds(5),
        retentionPeriod: cdk.Duration.days(1),
        deadLetterQueue: {
          queue: userJoinedOrganizationDLQ,
          maxReceiveCount: 4,
        },
      }
    );
    userJoinedOrganizationQueue.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("sns.amazonaws.com")],
        actions: ["sqs:SendMessage"],
        resources: [userJoinedOrganizationQueue.queueArn],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": this.account,
          },
          ArnLike: {
            // Allows all buckets to send notifications since we haven't created the bucket yet.
            "aws:SourceArn": `arn:aws:sns:*:*:${buildConfig.AUTH_SNSUserJoinedOrganizationTopic}`,
          },
        },
      })
    );
    const importedUserJoinedOrganizationTopic = sns.Topic.fromTopicArn(
      this,
      "ImportedUserJoinedOrganizationTopic",
      `arn:aws:sns:${buildConfig.Region}:${buildConfig.AccountID}:${buildConfig.AUTH_SNSUserJoinedOrganizationTopic}`
    );
    if (!importedUserJoinedOrganizationTopic) {
      throw new Error(
        "ImportedUserJoinedOrganizationTopic needs to come from auth"
      );
    }
    importedUserJoinedOrganizationTopic.addSubscription(
      new subs.SqsSubscription(userJoinedOrganizationQueue)
    );
    return userJoinedOrganizationQueue;
  }
  createOrderQueue(buildConfig: BuildConfig): cdk.aws_sqs.Queue {
    const orderCreatedDLQ = new sqs.Queue(this, "Account-OrderDLQ", {
      queueName: "Account-OrderDLQ",
      retentionPeriod: cdk.Duration.hours(10),
    });
    const orderCreatedQueue = new sqs.Queue(this, "Account-OrderQueue", {
      queueName: "Account-OrderQueue",
      visibilityTimeout: cdk.Duration.minutes(2),
      receiveMessageWaitTime: cdk.Duration.seconds(5),
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        queue: orderCreatedDLQ,
        maxReceiveCount: 4,
      },
    });
    orderCreatedQueue.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("sns.amazonaws.com")],
        actions: ["sqs:SendMessage"],
        resources: [orderCreatedQueue.queueArn],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": this.account,
          },
          ArnLike: {
            "aws:SourceArn": `arn:aws:sns:*:*:${buildConfig.ORDER_SNSOrderTopic}`,
          },
        },
      })
    );
    const importedOrderTopic = sns.Topic.fromTopicArn(
      this,
      "ImportedOrderTopic",
      `arn:aws:sns:${buildConfig.Region}:${buildConfig.AccountID}:${buildConfig.ORDER_SNSOrderTopic}`
    );
    if (!importedOrderTopic) {
      throw new Error("importedOrderTopic needs to come from Order");
    }
    importedOrderTopic.addSubscription(
      new subs.SqsSubscription(orderCreatedQueue)
    );
    return orderCreatedQueue;
  }
  userCreatedHandler(
    buildConfig: BuildConfig,
    userCreatedSQS: cdk.aws_sqs.Queue,
    accountDB: cdk.aws_dynamodb.ITable
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
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
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
  userJoinedOrganizationHandler(
    buildConfig: BuildConfig,
    userJoinedOrganizationSQS: cdk.aws_sqs.Queue,
    accountDB: cdk.aws_dynamodb.ITable
  ): cdk.aws_lambda_nodejs.NodejsFunction {
    const userJoinedOrganizationHandler = new NodejsFunction(
      this,
      "Account-SqsUserJoinedOrganizationHandler",
      {
        memorySize: 1024,
        timeout: cdk.Duration.minutes(1),
        functionName: "Account-SqsUserJoinedOrganizationHandler",
        runtime: lambda.Runtime.NODEJS_16_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          `/../src/handlers/user-joined-organization-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
        },
      }
    );
    userJoinedOrganizationHandler.addEventSource(
      new SqsEventSource(userJoinedOrganizationSQS, {
        batchSize: 1,
      })
    );
    accountDB.grantReadWriteData(userJoinedOrganizationHandler);
    return userJoinedOrganizationHandler;
  }
  createOrderSQSHandler(
    buildConfig: BuildConfig,
    orderCreatedSQS: cdk.aws_sqs.Queue,
    accountDB: cdk.aws_dynamodb.ITable
  ): cdk.aws_lambda_nodejs.NodejsFunction {
    const orderCreatedHandler = new NodejsFunction(
      this,
      "Account-SQSOrderHandler",
      {
        memorySize: 1024,
        timeout: cdk.Duration.minutes(1),
        functionName: "Account-SQSOrderHandler",
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          `/../src/handlers/organizations/sqs/order/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
        },
      }
    );
    orderCreatedHandler.addEventSource(
      new SqsEventSource(orderCreatedSQS, {
        batchSize: 1,
      })
    );
    accountDB.grantReadWriteData(orderCreatedHandler);
    return orderCreatedHandler;
  }

  importAuthorizer(
    buildConfig: BuildConfig
  ): apiGatewayAuthorizers.HttpUserPoolAuthorizer {
    const importedUserPool = cognito.UserPool.fromUserPoolId(
      this,
      "ImportedHalAppAuthUserPool",
      buildConfig.UserPoolID
    );
    const importedUserPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
      this,
      "ImportedHalAppUserPoolClient",
      buildConfig.UserPoolClientID
    );

    const authorizer = new apiGatewayAuthorizers.HttpUserPoolAuthorizer(
      "Account-Authorizer",
      importedUserPool,
      {
        userPoolRegion: buildConfig.Region,
        userPoolClients: [importedUserPoolClient],
        identitySource: ["$request.header.Authorization"],
      }
    );
    return authorizer;
  }
  createGetOrganizationsHandler(
    buildConfig: BuildConfig,
    accountApi: apiGateway.HttpApi,
    authorizer: apiGatewayAuthorizers.HttpUserPoolAuthorizer,
    accountDB: cdk.aws_dynamodb.ITable
  ): cdk.aws_lambda_nodejs.NodejsFunction {
    const getOrganizationsHandler = new NodejsFunction(
      this,
      "AccountGetOrganizationsHandler2",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_18_X,
        functionName: "Account-GetOrganizationsHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(15),
        entry: path.join(
          __dirname,
          `/../src/handlers/account-get-organizations-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
        },
      }
    );
    accountApi.addRoutes({
      methods: [HttpMethod.GET],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        "getOrganizationsHandlerIntegration",
        getOrganizationsHandler
      ),
      path: "/organizations",
      authorizer,
    });
    accountDB.grantReadData(getOrganizationsHandler);
    return getOrganizationsHandler;
  }
  createAdminPutOrganizationToggleActivationHandler(
    buildConfig: BuildConfig,
    accountApi: apiGateway.HttpApi,
    authorizer: apiGatewayAuthorizers.HttpUserPoolAuthorizer,
    accountDB: cdk.aws_dynamodb.ITable
  ): cdk.aws_lambda_nodejs.NodejsFunction {
    const adminPutOrganizationActivationChangedHandler = new NodejsFunction(
      this,
      "AccountAdminPutOrganizationActivationChangedHandler2",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_18_X,
        functionName: "Account-AdminPutOrganizationActivationChangedHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(10),
        entry: path.join(
          __dirname,
          `/../src/handlers/organizations/admin/put/id/activation/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
        },
      }
    );
    accountApi.addRoutes({
      methods: [HttpMethod.PUT],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        "adminPutOrganizationActivationChangedHandlerIntegration",
        adminPutOrganizationActivationChangedHandler
      ),
      path: "/admin/organizations/{id}/activation",
      authorizer,
    });
    accountDB.grantReadWriteData(adminPutOrganizationActivationChangedHandler);
    return adminPutOrganizationActivationChangedHandler;
  }
  createAdminGetOrganizationsHandler(
    buildConfig: BuildConfig,
    accountApi: apiGateway.HttpApi,
    authorizer: apiGatewayAuthorizers.HttpUserPoolAuthorizer,
    accountDB: cdk.aws_dynamodb.ITable
  ): cdk.aws_lambda_nodejs.NodejsFunction {
    const adminGetOrganizationsHandler = new NodejsFunction(
      this,
      "AccountAdminGetOrganizationsHandler2",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_18_X,
        functionName: "Account-AdminGetOrganizationsHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(10),
        entry: path.join(
          __dirname,
          `/../src/handlers/account-admin-get-organizations-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
        },
      }
    );
    accountApi.addRoutes({
      methods: [HttpMethod.GET],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        "adminGetOrganizationsHandlerIntegration",
        adminGetOrganizationsHandler
      ),
      path: "/admin/organizations",
      authorizer,
    });
    accountDB.grantReadData(adminGetOrganizationsHandler);
    return adminGetOrganizationsHandler;
  }
  createPutOrganizationUpdateHandler(
    buildConfig: BuildConfig,
    accountApi: apiGateway.HttpApi,
    authorizer: apiGatewayAuthorizers.HttpUserPoolAuthorizer,
    accountDB: cdk.aws_dynamodb.ITable
  ) {
    const putOrganizationUpdateHandler = new NodejsFunction(
      this,
      "Account-PutOrganizationsUpdateHandler",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_18_X,
        functionName: "Account-PutOrganizationsUpdateHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(10),
        entry: path.join(
          __dirname,
          `/../src/handlers/account-put-organization-update-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
        },
      }
    );
    accountApi.addRoutes({
      methods: [HttpMethod.PUT],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        "putOrganizationsUpdateHandlerIntegration",
        putOrganizationUpdateHandler
      ),
      path: "/organizations/{organizationId}",
      authorizer,
    });
    accountDB.grantReadWriteData(putOrganizationUpdateHandler);
    return putOrganizationUpdateHandler;
  }
  createPostOrganizationUpdateDeliveryAddressesHandler(
    buildConfig: BuildConfig,
    accountApi: apiGateway.HttpApi,
    authorizer: apiGatewayAuthorizers.HttpUserPoolAuthorizer,
    accountDB: cdk.aws_dynamodb.ITable
  ) {
    const postOrganizationUpdateDeliveryAddressesHandler = new NodejsFunction(
      this,
      "AccountPostOrganizationsUpdateDeliveryAddressesHandler",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_18_X,
        functionName: "Account-PostOrganizationsUpdateDeliveryAddressesHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(10),
        entry: path.join(
          __dirname,
          `/../src/handlers/account-post-organization-update-delivery-addresses-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
        },
      }
    );
    accountApi.addRoutes({
      methods: [HttpMethod.POST],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        "PostOrganizationsUpdateDeliveryAddressesHandlerIntegration",
        postOrganizationUpdateDeliveryAddressesHandler
      ),
      path: "/organizations/{organizationId}/deliveryaddresses",
      authorizer,
    });
    accountDB.grantReadWriteData(
      postOrganizationUpdateDeliveryAddressesHandler
    );
    return postOrganizationUpdateDeliveryAddressesHandler;
  }
  createGetOrganizationHandler(
    buildConfig: BuildConfig,
    accountApi: apiGateway.HttpApi,
    authorizer: apiGatewayAuthorizers.HttpUserPoolAuthorizer,
    accountDB: cdk.aws_dynamodb.ITable
  ) {
    const getOrganizationHandler = new NodejsFunction(
      this,
      "AccountGetOrganizationHandler",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_18_X,
        functionName: "Account-GetOrganizationHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(10),
        entry: path.join(
          __dirname,
          `/../src/handlers/organizations/get/id/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
        },
      }
    );
    accountApi.addRoutes({
      methods: [HttpMethod.GET],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        "GetOrganizationHandlerIntegration",
        getOrganizationHandler
      ),
      path: "/organizations/{organizationId}",
      authorizer,
    });
    accountDB.grantReadData(getOrganizationHandler);
    return getOrganizationHandler;
  }
  createGetOrganizationUsersHandler(
    buildConfig: BuildConfig,
    accountApi: apiGateway.HttpApi,
    authorizer: apiGatewayAuthorizers.HttpUserPoolAuthorizer,
    accountDB: cdk.aws_dynamodb.ITable
  ) {
    const getOrganizationHandler = new NodejsFunction(
      this,
      "AccountGetOrganizationUsersHandler",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_18_X,
        functionName: "Account-GetOrganizationUsersHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(10),
        entry: path.join(
          __dirname,
          `/../src/handlers/organizations/get/id/users/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
        },
      }
    );
    accountApi.addRoutes({
      methods: [HttpMethod.GET],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        "GetOrganizationUsersHandlerIntegration",
        getOrganizationHandler
      ),
      path: "/organizations/{organizationId}/users",
      authorizer,
    });
    accountDB.grantReadData(getOrganizationHandler);
    return getOrganizationHandler;
  }
  createPostOrganizationUser(
    buildConfig: BuildConfig,
    accountApi: apiGateway.HttpApi,
    authorizer: apiGatewayAuthorizers.HttpUserPoolAuthorizer,
    accountDB: cdk.aws_dynamodb.ITable,
    organizationCreatedTopic: cdk.aws_sns.Topic
  ) {
    const postOrganizationUserHandler = new NodejsFunction(
      this,
      "AccountPostOrganizationUserHandler",
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_18_X,
        functionName: "Account-PostOrganizationUserHandler",
        handler: "handler",
        timeout: cdk.Duration.seconds(10),
        entry: path.join(
          __dirname,
          `/../src/handlers/organizations/post/id/users/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          Region: buildConfig.Region,
          AccountDB: buildConfig.AccountDBName,
          SNSOrganizationCreatedTopicArn: organizationCreatedTopic.topicArn,
        },
      }
    );
    organizationCreatedTopic.grantPublish(postOrganizationUserHandler);
    accountApi.addRoutes({
      methods: [HttpMethod.POST],
      integration: new apiGatewayIntegrations.HttpLambdaIntegration(
        "PostOrganizationUsersHandlerIntegration",
        postOrganizationUserHandler
      ),
      path: "/organizations/{organizationId}/users",
      authorizer,
    });
    accountDB.grantReadData(postOrganizationUserHandler);
    return postOrganizationUserHandler;
  }
}
