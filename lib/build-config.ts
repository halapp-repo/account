export interface BuildConfig {
  readonly AWSAccountID: string;
  readonly App: string;
  readonly Environment: string;
  readonly Region: string;
  readonly SESFromEmail: string;
  readonly SESCCEmail: string;
  readonly S3OrganizationEnrollmentEmailTemplate: string;
  readonly SQSOrganizationCreatedQueueArn: string;
  readonly SNSUserCreatedTopicArn: string;
}
