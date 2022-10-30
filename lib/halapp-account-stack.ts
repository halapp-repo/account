import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, LogLevel } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import getConfig from "../config";
import { BuildConfig } from "./build-config";

export class HalappAccountStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const buildConfig = getConfig(scope as cdk.App);
    // **************
    // Create Bucket
    // **************
    const emailTemplateBucket = this.createEmailTemplateBucket();
    // ********************
    // Create API Gateway
    // ********************
    const accountApi = this.createAccountApiGateway();
    const organizationsResource = accountApi.root.addResource("organizations");
    const organizationsEnrollmentResource =
      organizationsResource.addResource("enrollment");

    this.createOrganizationEnrollmentHandler(
      organizationsEnrollmentResource,
      emailTemplateBucket,
      buildConfig
    );
  }
  createAccountApiGateway(): cdk.aws_apigateway.RestApi {
    const accountApi = new apigateway.RestApi(this, "HalAppAccountApi", {
      description: "HalApp Account Api Gateway",
    });
    return accountApi;
  }
  createOrganizationEnrollmentHandler(
    organizationsEnrollmentResource: cdk.aws_apigateway.Resource,
    emailTemplateBucket: cdk.aws_s3.Bucket,
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
          `/../src/account-post-organizations-enrollment-handler/index.ts`
        ),
        bundling: {
          target: "es2020",
          keepNames: true,
          logLevel: LogLevel.INFO,
          sourceMap: true,
          minify: true,
        },
        environment: {
          S3BucketName: emailTemplateBucket.bucketName,
          SESFromEmail: buildConfig.SESFromEmail,
          SESToEmail: buildConfig.SESCCEmail,
          EmailTemplate: buildConfig.S3OrganizationEnrollmentEmailTemplate,
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
    emailTemplateBucket.grantRead(organizationsEnrollmentHandler);
    return organizationsEnrollmentHandler;
  }
  createEmailTemplateBucket(): cdk.aws_s3.Bucket {
    const emailTemplateBucket = new s3.Bucket(this, "HalEmailTemplate", {
      bucketName: `hal-emailtemplate-${this.account}`,
      autoDeleteObjects: false,
      versioned: true,
    });
    return emailTemplateBucket;
  }
}
