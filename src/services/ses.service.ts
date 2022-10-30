import { inject, injectable } from "tsyringe";
import * as ejs from "ejs";
import { SESStore } from "../repositories/ses-store";
import { OrganizationEnrollmentDTO } from "../models/dto/organization-enrollment.dto";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { S3Store } from "../repositories/s3-store";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import createHttpError = require("http-errors");

@injectable()
export class SESService {
  toAddress: string;
  fromAddress: string;
  s3BucketName: string;
  emailTemplate: string;
  constructor(
    @inject("SESStore")
    private sesStore: SESStore,
    @inject("S3Store")
    private s3Store: S3Store
  ) {
    const { SESFromEmail, SESToEmail, S3BucketName, EmailTemplate } =
      process.env;
    if (!SESToEmail) {
      throw new createHttpError.InternalServerError(
        "SESToEmail must come from env"
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
    this.toAddress = SESToEmail;
    this.fromAddress = SESFromEmail;
    this.s3BucketName = S3BucketName;
    this.emailTemplate = EmailTemplate;
  }
  async sendOrganizationEnrollmentEmail(
    data: OrganizationEnrollmentDTO
  ): Promise<void> {
    const { Body } = await this.s3Store.s3Client.send(
      new GetObjectCommand({
        Bucket: this.s3BucketName,
        Key: this.emailTemplate,
      })
    );
    // Convert the ReadableStream to a string.
    const fileStr: string = await Body.transformToString();

    const body = await ejs.render(fileStr, {
      organizationName: data.organizationName,
      formattedAddress: data.formattedAddress,
      email: data.email,
      phoneNumber: data.phoneNumber,
      fullRequest: JSON.stringify(data),
    });
    const sesCommand = new SendEmailCommand({
      Destination: {
        ToAddresses: [this.toAddress],
      },
      Message: {
        Body: {
          Html: {
            Data: body,
          },
        },
        Subject: {
          Data: "Yeni Sirket Talebi",
        },
      },
      Source: this.fromAddress,
    });
    await this.sesStore.sesClient.send(sesCommand);
  }
}
