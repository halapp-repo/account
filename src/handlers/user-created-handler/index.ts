import "reflect-metadata";
import { SQSEvent, SNSMessage } from "aws-lambda";
import { diContainer } from "../../core/di-registry";
import UserRepository from "../../repositories/user.repository";
import { User } from "../../models/user";

export async function handler(event: SQSEvent) {
  const repo = diContainer.resolve(UserRepository);
  console.log(JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    const { body } = record;
    const rawMessage = JSON.parse(body) as SNSMessage;
    // Add Record to Signup DB
    console.log(rawMessage.Message);
    const message = JSON.parse(rawMessage.Message || "{}");

    const { userId, email } = message;
    if (!userId || !email) {
      continue;
    }
    const existingUser = await repo.getUserBy(email);
    if (existingUser) {
      throw new Error(`User with Email :${existingUser.Email} already exists`);
    }
    const creatingUser = new User();
    creatingUser.createUser({
      id: userId,
      email,
    });
    await repo.saveUser(creatingUser);
  }
}
