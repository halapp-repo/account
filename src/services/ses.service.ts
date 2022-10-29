import { inject, injectable } from "tsyringe";
import * as ejs from "ejs";
import * as path from "path";
import { SESStore } from "../repositories/ses-store";
import { OrganizationEnrollmentDTO } from "../models/dto/organization-enrollment.dto";
import { SendEmailCommand } from "@aws-sdk/client-ses";

@injectable()
export class SESService {
  toAddress: string;
  fromAddress: string;
  constructor(
    @inject("SESStore")
    private store: SESStore
  ) {
    const { SESFromEmail, SESToEmail } = process.env;
    if (!SESToEmail) {
      throw new Error("SESToEmail must come from env");
    }
    if (!SESFromEmail) {
      throw new Error("SESFromEmail must come from env");
    }
    this.toAddress = SESToEmail;
    this.fromAddress = SESFromEmail;
  }
  async sendOrganizationEnrollmentEmail(
    data: OrganizationEnrollmentDTO
  ): Promise<void> {
    const body = await ejs.renderFile(
      path.join(__dirname, "../templates/organization-enrollment.ejs"),
      {
        organizationName: data.organizationName,
        formattedAddress: data.formattedAddress,
        email: data.email,
        phoneNumber: data.phoneNumber,
        fullRequest: JSON.stringify(data),
      }
    );

    await this.store.sesClient.send(
      new SendEmailCommand({
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
      })
    );
  }
}
