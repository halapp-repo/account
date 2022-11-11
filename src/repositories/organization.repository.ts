import { inject, injectable } from "tsyringe";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoStore } from "./dynamo-store";
import createHttpError = require("http-errors");
import { OrganizationEvent } from "../models/events";
import { OrgEventToAcctRepositoryDTOMapper } from "../mappers/org-event-to-org-repository-dto.mapper";
import { AccountRepositoryDTO } from "../models/dto/account.repository.dto";
import { Organization } from "../models/organization";
import { getComparator } from "../utils/sort";

@injectable()
export default class OrganizationRepository {
  private tableName: string;

  constructor(
    @inject("DBStore")
    private store: DynamoStore,
    @inject("OrgEventToOrgRepoMapper")
    private mapper: OrgEventToAcctRepositoryDTOMapper
  ) {
    const { AccountDB } = process.env;
    if (!AccountDB) {
      throw new createHttpError.InternalServerError(
        "AccountDB must come from env"
      );
    }
    this.tableName = AccountDB;
  }
  async saveOrg(org: Organization) {
    for (const event of org.Changes) {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: this.mapper.toDTO(event),
      });
      await this.store.dynamoClient.send(command);
    }
  }
  async getOrg(id: string): Promise<Organization | null> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "#AccountId = :AccountId",
      ExpressionAttributeNames: {
        "#AccountId": "AccountId",
      },
      ExpressionAttributeValues: {
        ":AccountId": `org#${id}`,
      },
    });
    const { Items } = await this.store.dynamoClient.send(command);
    if (!Items) {
      return null;
    }
    const listOfEvents = this.mapper.toListModel(
      Items.map((i) => {
        return <AccountRepositoryDTO>{
          AccountId: i["AccountId"],
          TS: i["TS"],
          EventType: i["EventType"],
          Payload: i["Payload"],
        };
      })
    );
    const sortedEvents = listOfEvents.sort(getComparator("asc", "TS"));
    const org = new Organization();
    for (const event of sortedEvents) {
      org.apply(event);
    }
    return org;
  }
}
