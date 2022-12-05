import { inject, injectable } from "tsyringe";
import { PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoStore } from "./dynamo-store";
import createHttpError = require("http-errors");
import { OrganizationEvent } from "../models/events";
import { OrgEventToOrgRepositoryDTOMapper } from "../mappers/org-event-to-org-repository-dto.mapper";
import { OrganizationRepositoryDTO } from "../models/dto/account.repository.dto";
import { Organization } from "../models/organization";
import { getComparator } from "../utils/sort";

@injectable()
export default class OrganizationRepository {
  private tableName: string;

  constructor(
    @inject("DBStore")
    private store: DynamoStore,
    @inject("OrgEventToOrgRepoMapper")
    private mapper: OrgEventToOrgRepositoryDTOMapper
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
        Item: this.mapper.toDTO(event as OrganizationEvent),
      });
      await this.store.dynamoClient.send(command);
    }
  }
  async getOrg(id: string): Promise<Organization | null> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "#AccountID = :AccountID",
      ExpressionAttributeNames: {
        "#AccountID": "AccountID",
      },
      ExpressionAttributeValues: {
        ":AccountID": `org#${id}`,
      },
    });
    const { Items } = await this.store.dynamoClient.send(command);
    if (!Items) {
      return null;
    }
    const listOfEvents = this.mapper.toListModel(
      Items.map((i) => {
        return <OrganizationRepositoryDTO>{
          AccountID: i["AccountID"],
          TS: i["TS"],
          EventType: i["EventType"],
          Payload: i["Payload"],
          VKN: i["VKN"],
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
  async getOrgBy(vkn: string): Promise<Organization | null> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: "VKNIndex",
      KeyConditionExpression: "#VKN = :VKN",
      ExpressionAttributeNames: {
        "#VKN": "VKN",
      },
      ExpressionAttributeValues: {
        ":VKN": `${vkn}`,
      },
    });
    const { Items } = await this.store.dynamoClient.send(command);
    if (!Items || Items.length == 0) {
      return null;
    }
    const listOfEvents = this.mapper.toListModel(
      Items.map((i) => {
        return <OrganizationRepositoryDTO>{
          AccountID: i["AccountID"],
          TS: i["TS"],
          EventType: i["EventType"],
          Payload: i["Payload"],
          VKN: i["VKN"],
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
  async getAllOrgIds(): Promise<string[] | null> {
    const command = new ScanCommand({
      TableName: this.tableName,
      IndexName: "VKNIndex",
    });
    const { Items } = await this.store.dynamoClient.send(command);
    if (!Items) {
      return null;
    }
    const listOfEvents = this.mapper.toListModel(
      Items.map((i) => {
        return <OrganizationRepositoryDTO>{
          AccountID: i["AccountID"],
          TS: i["TS"],
          EventType: i["EventType"],
          Payload: i["Payload"],
          VKN: i["VKN"],
        };
      })
    );
    const sortedEvents = listOfEvents.sort(getComparator("asc", "TS"));
    const organizationIds: string[] = [];
    for (const event of sortedEvents) {
      const org = new Organization();
      org.apply(event);
      organizationIds.push(org.ID);
    }
    return [...new Set(organizationIds)];
  }
}
