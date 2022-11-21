import "reflect-metadata";
import { SQSEvent, SNSMessage } from "aws-lambda";
import { diContainer } from "../../core/di-registry";
import UserRepository from "../../repositories/user.repository";
import { User } from "../../models/user";
import OrganizationRepository from "../../repositories/organization.repository";

export async function handler(event: SQSEvent) {
  const userRepo = diContainer.resolve(UserRepository);
  const orgRepo = diContainer.resolve(OrganizationRepository);

  console.log(JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    const { body } = record;
    const rawMessage = JSON.parse(body) as SNSMessage;
    // Add Record to Signup DB
    console.log(rawMessage.Message);
    const message = JSON.parse(rawMessage.Message || "{}");

    const { userId, email, organizationId } = message;

    if (!userId || !email || !organizationId) {
      console.warn("userId or email or organizationId are empty");
      continue;
    }
    const existingUser = await userRepo.getUserBy(email);
    if (existingUser) {
      throw new Error(`User with Email :${existingUser.Email} already exists`);
    }
    const creatingUser = User.create({ id: userId, email, organizationId });
    await userRepo.saveUser(creatingUser);

    const foundOrganization = await orgRepo.getOrg(organizationId);
    if (!foundOrganization) {
      throw new Error(
        `Organization with Id :${organizationId} does not exists`
      );
    }
    foundOrganization.userJoin(creatingUser.ID);
    await orgRepo.saveOrg(foundOrganization);
  }
}
