export interface BuildConfig {
  readonly AccountID: string;
  readonly App: string;
  readonly Environment: string;
  readonly Region: string;
  readonly SESFromEmail: string;
  readonly SESCCEmail: string;
  readonly S3OrganizationEnrollmentEmailTemplate: string;

  readonly ShouldCreateDynamoAccountDB: boolean;
  readonly AccountDBName: string;
  // COGNITO
  readonly UserPoolID: string;
  readonly UserPoolClientID: string;
  // SNS
  readonly AUTH_SNSUserCreatedTopic: string;
  readonly AUTH_SNSUserJoinedOrganizationTopic: string;
  readonly SNSOrganizationCreatedTopic: string;
  readonly ORDER_SNSOrderCreatedTopic: string;
  // SQS
  readonly AUTH_SQSOrganizationCreatedQueue: string;
  readonly SQSUserCreatedQueue: string;
  readonly SQSUserJoinedOrganizationQueue: string;
}
