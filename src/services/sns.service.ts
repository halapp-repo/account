import { inject, injectable } from "tsyringe";
import { SNSStore } from "../repositories/sns-store";
import { PublishCommand } from "@aws-sdk/client-sns";
import createHttpError = require("http-errors");
import { AccountEventType } from "@halapp/common";

@injectable()
export class SNSService {
  topicArn: string;
  constructor(
    @inject("SNSStore")
    private snsStore: SNSStore
  ) {
    const { SNSOrganizationCreatedTopicArn } = process.env;
    if (!SNSOrganizationCreatedTopicArn) {
      throw new createHttpError.InternalServerError(
        "SNSOrganizationCreatedTopicArn must come from env"
      );
    }
    this.topicArn = SNSOrganizationCreatedTopicArn;
  }
  async publishOrganizationCreatedMessage({
    organizationName,
    organizationID,
    toEmail,
    eventType,
  }: {
    organizationName: string;
    organizationID: string;
    toEmail: string;
    eventType: AccountEventType;
  }): Promise<void> {
    const command = new PublishCommand({
      Message: JSON.stringify({
        organizationName,
        organizationID,
        toEmail,
        type: eventType,
      }),
      Subject: "OrganizationCreated",
      TopicArn: this.topicArn,
    });
    const data = await this.snsStore.snsClient.send(command);
    console.log("Message sent", data);
  }
}
