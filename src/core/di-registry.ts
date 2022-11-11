import { container } from "tsyringe";
import { OrgEventToAcctRepositoryDTOMapper } from "../mappers/org-event-to-org-repository-dto.mapper";
import { DynamoStore } from "../repositories/dynamo-store";
import OrganizationRepository from "../repositories/organization.repository";
import { S3Store } from "../repositories/s3-store";
import { SESStore } from "../repositories/ses-store";
import { SNSStore } from "../repositories/sns-store";

container.registerSingleton<SESStore>("SESStore", SESStore);
container.registerSingleton<S3Store>("S3Store", S3Store);
container.registerSingleton<DynamoStore>("DBStore", DynamoStore);
container.registerSingleton<SNSStore>("SNSStore", SNSStore);
container.register("OrgEventToOrgRepoMapper", {
  useClass: OrgEventToAcctRepositoryDTOMapper,
});
container.register("OrganizationRepository", {
  useClass: OrganizationRepository,
});

export const diContainer = container;
