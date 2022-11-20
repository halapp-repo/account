import { inject, injectable } from "tsyringe";
import * as ejs from "ejs";
import { SESStore } from "../repositories/ses-store";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { S3Store } from "../repositories/s3-store";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import createHttpError = require("http-errors");

@injectable()
export class SESService {
  fromAddress: string;
  ccAddress: string;
  s3BucketName: string;
  emailTemplate: string;
  constructor(
    @inject("SESStore")
    private sesStore: SESStore,
    @inject("S3Store")
    private s3Store: S3Store
  ) {
    const { SESFromEmail, SESCCEmail, S3BucketName, EmailTemplate } =
      process.env;
    if (!SESCCEmail) {
      throw new createHttpError.InternalServerError(
        "SESCCEmail must come from env"
      );
    }
    if (!SESFromEmail) {
      throw new createHttpError.InternalServerError(
        "SESFromEmail must come from env"
      );
    }
    if (!S3BucketName) {
      throw new createHttpError.InternalServerError(
        "S3Bucket must come from env"
      );
    }
    if (!EmailTemplate) {
      throw new createHttpError.InternalServerError(
        "EmailTemplate must come from env"
      );
    }
    this.fromAddress = SESFromEmail;
    this.ccAddress = SESCCEmail;
    this.s3BucketName = S3BucketName;
    this.emailTemplate = EmailTemplate;
  }
  async sendNewOrganizationCreatedEmail({
    organizationName,
    organizationID,
    formattedAddress,
    email,
    phoneNumber,
  }: {
    organizationName: string;
    organizationID: string;
    formattedAddress: string;
    email: string;
    phoneNumber: string;
  }): Promise<void> {
    const { Body } = await this.s3Store.s3Client.send(
      new GetObjectCommand({
        Bucket: this.s3BucketName,
        Key: this.emailTemplate,
      })
    );
    // Convert the ReadableStream to a string.
    const fileStr: string | undefined = await Body?.transformToString();
    if (!fileStr) {
      throw new Error("fileStr is undefined");
    }

    const body = await ejs.render(fileStr, {
      organizationName,
      organizationID,
      formattedAddress,
      email,
      phoneNumber,
    });
    const sesCommand = new SendEmailCommand({
      Destination: {
        ToAddresses: [this.ccAddress],
      },
      Message: {
        Body: {
          Html: {
            Data: body,
          },
        },
        Subject: {
          Data: "Yeni Sirket Yaratildi",
        },
      },
      Source: this.fromAddress,
    });
    await this.sesStore.sesClient.send(sesCommand);
    console.log("Message sent");
  }
}
