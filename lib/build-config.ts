export interface BuildConfig {
  readonly AWSAccountID: string;
  readonly App: string;
  readonly Environment: string;
  readonly Region: string;
  readonly SESFromEmail: string;
  readonly SESCCEmail: string;
}
