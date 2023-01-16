import "reflect-metadata";
import { SQSEvent, SNSMessage } from "aws-lambda";
import { diContainer } from "../../core/di-registry";
import UserRepository from "../../repositories/user.repository";
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

    const { userId, organizationId } = message;

    if (!userId || !organizationId) {
      console.warn("userId or organizationId are empty");
      continue;
    }
    const existingUser = await userRepo.getUser(userId);
    if (!existingUser) {
      throw new Error(`User with UserId does not exists`);
    }

    const foundOrganization = await orgRepo.getOrg(organizationId);
    if (!foundOrganization) {
      throw new Error(
        `Organization with Id :${organizationId} does not exists`
      );
    }
    existingUser.joinOrganization(organizationId);
    foundOrganization.userJoin(userId);
    await orgRepo.saveOrg(foundOrganization);
    await userRepo.saveUser(existingUser);
  }
}
