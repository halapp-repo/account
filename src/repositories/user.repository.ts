import { inject, injectable } from "tsyringe";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoStore } from "./dynamo-store";
import createHttpError = require("http-errors");
import { UserEvent } from "../models/events";
import { UserRepositoryDTO } from "../models/dto/account.repository.dto";
import { getComparator } from "../utils/sort";
import { User } from "../models/user";
import { UserEventToUserRepositoryDTOMapper } from "../mappers/user-event-to-user-respository-dto.mapper";

@injectable()
export default class UserRepository {
  private tableName: string;

  constructor(
    @inject("DBStore")
    private store: DynamoStore,
    @inject("UserEventToUserRepoMapper")
    private mapper: UserEventToUserRepositoryDTOMapper
  ) {
    const { AccountDB } = process.env;
    if (!AccountDB) {
      throw new createHttpError.InternalServerError(
        "AccountDB must come from env"
      );
    }
    this.tableName = AccountDB;
  }
  async saveUser(org: User) {
    for (const event of org.Changes) {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: this.mapper.toDTO(event as UserEvent),
      });
      await this.store.dynamoClient.send(command);
    }
  }
  async getUser(id: string): Promise<User | null> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "#AccountID = :AccountID",
      ExpressionAttributeNames: {
        "#AccountID": "AccountID",
      },
      ExpressionAttributeValues: {
        ":AccountID": `user#${id}`,
      },
    });
    const { Items } = await this.store.dynamoClient.send(command);
    if (!Items) {
      return null;
    }
    const listOfEvents = this.mapper.toListModel(
      Items.map((i) => {
        return <UserRepositoryDTO>{
          AccountID: i["AccountID"],
          TS: i["TS"],
          EventType: i["EventType"],
          Payload: i["Payload"],
          Email: i["Email"],
        };
      })
    );
    const sortedEvents = listOfEvents.sort(getComparator("asc", "TS"));
    const user = new User();
    for (const event of sortedEvents) {
      user.apply(event);
    }
    return user;
  }
  async getUserBy(email: string): Promise<User | null> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: "EmailIndex",
      KeyConditionExpression: "#Email = :Email",
      ExpressionAttributeNames: {
        "#Email": "Email",
      },
      ExpressionAttributeValues: {
        ":Email": `${email}`,
      },
    });
    const { Items } = await this.store.dynamoClient.send(command);
    if (!Items || Items.length === 0) {
      return null;
    }
    const listOfEvents = this.mapper.toListModel(
      Items.map((i) => {
        return <UserRepositoryDTO>{
          AccountID: i["AccountID"],
          TS: i["TS"],
          EventType: i["EventType"],
          Payload: i["Payload"],
          Email: i["Email"],
        };
      })
    );
    const sortedEvents = listOfEvents.sort(getComparator("asc", "TS"));
    const user = new User();
    for (const event of sortedEvents) {
      user.apply(event);
    }
    return user;
  }
}
