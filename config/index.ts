import { BuildConfig } from "../lib/build-config";
import { parse } from "yaml";
import { readFileSync } from "fs";
import { resolve } from "path";
import * as cdk from "aws-cdk-lib";

function ensureString(
  object: { [name: string]: any },
  propName: string
): string {
  if (!object[propName] || object[propName].trim().length == 0) {
    throw new Error(`${propName} does not exist or is empty`);
  }
  return object[propName];
}

function getConfig(app: cdk.App): BuildConfig {
  const env = app.node.tryGetContext("config");
  if (!env) {
    throw new Error(
      "Contect variable missing on CDK command. Pass in as `-c config=XXX`"
    );
  }
  const unparsedEnv = parse(
    readFileSync(resolve(__dirname, `../config/${env}.yaml`), "utf8")
  );
  const buildConfig: BuildConfig = {
    AccountID: ensureString(unparsedEnv, "AccountID"),
    App: ensureString(unparsedEnv, "App"),
    Environment: ensureString(unparsedEnv, "Environment"),
    Region: ensureString(unparsedEnv, "Region"),
    SESFromEmail: ensureString(unparsedEnv, "SESFromEmail"),
    SESCCEmail: ensureString(unparsedEnv, "SESCCEmail"),
    S3OrganizationEnrollmentEmailTemplate: ensureString(
      unparsedEnv,
      "S3OrganizationEnrollmentEmailTemplate"
    ),

    ShouldCreateDynamoAccountDB:
      ensureString(unparsedEnv, "ShouldCreateDynamoAccountDB") === "true",
    AccountDBName: ensureString(unparsedEnv, "AccountDBName"),

    UserPoolID: ensureString(unparsedEnv, "UserPoolID"),
    UserPoolClientID: ensureString(unparsedEnv, "UserPoolClientID"),

    AUTH_SNSUserCreatedTopic: ensureString(
      unparsedEnv,
      "AUTH_SNSUserCreatedTopic"
    ),
    AUTH_SNSUserJoinedOrganizationTopic: ensureString(
      unparsedEnv,
      "AUTH_SNSUserJoinedOrganizationTopic"
    ),
    SNSOrganizationCreatedTopic: ensureString(
      unparsedEnv,
      "SNSOrganizationCreatedTopic"
    ),
    AUTH_SQSOrganizationCreatedQueue: ensureString(
      unparsedEnv,
      "AUTH_SQSOrganizationCreatedQueue"
    ),
    SQSUserCreatedQueue: ensureString(unparsedEnv, "SQSUserCreatedQueue"),
    SQSUserJoinedOrganizationQueue: ensureString(
      unparsedEnv,
      "SQSUserJoinedOrganizationQueue"
    ),
    ORDER_SNSOrderTopic: ensureString(unparsedEnv, "ORDER_SNSOrderTopic"),
  };
  return buildConfig;
}

export default getConfig;
