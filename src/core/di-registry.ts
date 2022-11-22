import { container } from "tsyringe";
import { OrgEventToOrgRepositoryDTOMapper } from "../mappers/org-event-to-org-repository-dto.mapper";
import { OrgToOrgViewModelMapper } from "../mappers/org-to-org-viewmodel.mapper";
import { UserEventToUserRepositoryDTOMapper } from "../mappers/user-event-to-user-respository-dto.mapper";
import { UserToUserViewModelMapper } from "../mappers/user-to-user-viewmode.mapper";
import { DynamoStore } from "../repositories/dynamo-store";
import OrganizationRepository from "../repositories/organization.repository";
import { S3Store } from "../repositories/s3-store";
import { SESStore } from "../repositories/ses-store";
import { SNSStore } from "../repositories/sns-store";
import UserRepository from "../repositories/user.repository";

container.registerSingleton<SESStore>("SESStore", SESStore);
container.registerSingleton<S3Store>("S3Store", S3Store);
container.registerSingleton<DynamoStore>("DBStore", DynamoStore);
container.registerSingleton<SNSStore>("SNSStore", SNSStore);
container.register("OrgEventToOrgRepoMapper", {
  useClass: OrgEventToOrgRepositoryDTOMapper,
});
container.register("UserEventToUserRepoMapper", {
  useClass: UserEventToUserRepositoryDTOMapper,
});
container.register("OrganizationRepository", {
  useClass: OrganizationRepository,
});
container.register("UserRepository", {
  useClass: UserRepository,
});
container.register("OrgToOrgViewModelMapper", {
  useClass: OrgToOrgViewModelMapper,
});
container.register("UserToUserViewModelMapper", {
  useClass: UserToUserViewModelMapper,
});

export const diContainer = container;
