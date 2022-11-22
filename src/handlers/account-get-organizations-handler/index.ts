import "reflect-metadata";
import "source-map-support/register";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpErrorHandler from "@middy/http-error-handler";
import httpResponseSerializer from "@middy/http-response-serializer";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import { diContainer } from "../../core/di-registry";
import UserRepository from "../../repositories/user.repository";
import OrganizationRepository from "../../repositories/organization.repository";
import createHttpError = require("http-errors");
import { OrgToOrgViewModelMapper } from "../../mappers/org-to-org-viewmodel.mapper";
import { OrganizationViewModel } from "../../models/viewmodel/organization.viewmodel";
import { UserToUserViewModelMapper } from "../../mappers/user-to-user-viewmode.mapper";
import { User } from "../../models/user";

const lambdaHandler = async function (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  context: Context
): Promise<APIGatewayProxyResult> {
  console.log(JSON.stringify(event, null, 2));
  console.log(JSON.stringify(context, null, 2));

  const userRepo = diContainer.resolve(UserRepository);
  const orgRepo = diContainer.resolve(OrganizationRepository);
  const orgVMMapper = diContainer.resolve(OrgToOrgViewModelMapper);
  const userVMMapper = diContainer.resolve(UserToUserViewModelMapper);

  const currentUserId = event.requestContext.authorizer.jwt.claims["sub"];
  if (!currentUserId) {
    throw createHttpError.Unauthorized();
  }
  const currentUser = await userRepo.getUser(`${currentUserId}`);
  if (!currentUser) {
    throw createHttpError.BadRequest();
  }
  const organizationVMList: OrganizationViewModel[] = [];
  for (const organizationId of currentUser?.JoinedOrganizations || []) {
    const organization = await orgRepo.getOrg(organizationId);
    if (organization) {
      const organizationVM = orgVMMapper.toDTO(organization);
      organizationVMList.push(organizationVM);
      if (organization.JoinedUsers.length === 1) {
        organizationVM.JoinedUsers = userVMMapper.toListDTO([currentUser]);
      } else {
        const userIds = organization.JoinedUsers;
        const users: User[] = [];
        for (const userId of userIds.filter((u) => u !== currentUserId)) {
          const user = await userRepo.getUser(`${userId}`);
          user && users.push(user);
        }
        organizationVM.JoinedUsers = userVMMapper.toListDTO([
          ...users,
          currentUser,
        ]);
      }
    }
  }
  return {
    statusCode: 200,
    body: JSON.stringify(organizationVMList),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

const handler = middy(lambdaHandler)
  .use(httpResponseSerializer())
  .use(httpErrorHandler())
  .use(cors());

export { handler, lambdaHandler };
