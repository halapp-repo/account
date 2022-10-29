import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, LogLevel } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import getConfig from "../config";
import { BuildConfig } from "./build-config";

export class HalappAccountStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const buildConfig = getConfig(scope as cdk.App);
    // ********************
    // Create API Gateway
    // ********************
    const accountApi = this.createAccountApiGateway();
    const organizationsResource = accountApi.root.addResource("organizations");
    const organizationsEnrollmentResource =
      organizationsResource.addResource("enrollment");
    // ***************************
    // Create Lambda Handler
    // ***************************
    //
    // ****ORGANIZATION API Handler****
    //
    this.createOrganizationEnrollmentHandler(
      organizationsEnrollmentResource,
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
    buildConfig: BuildConfig
  ): cdk.aws_lambda_nodejs.NodejsFunction {
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
          SESFromEmail: buildConfig.SESFromEmail,
          SESToEmail: buildConfig.SESCCEmail,
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
    return organizationsEnrollmentHandler;
  }
}
