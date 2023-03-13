import "reflect-metadata";
import "source-map-support/register";
import middy from "@middy/core";
import { diContainer } from "../../../../../core/di-registry";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import { OrganizationService } from "../../../../../services/organization.service";
import { Organization } from "../../../../../models/organization";
import httpResponseSerializer from "@middy/http-response-serializer";
import httpErrorHandler from "@middy/http-error-handler";
import createHttpError = require("http-errors");
import { UserService } from "../../../../../services/user.service";
import { UserToUserViewModelMapper } from "../../../../../mappers/user-to-user-viewmodel.mapper";
import { User } from "../../../../../models/user";

const lambdaHandler = async function (
  event: any | APIGatewayProxyEventV2WithJWTAuthorizer,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Print event
  console.log(JSON.stringify(event));
  const organizationService = diContainer.resolve(OrganizationService);
  const userService = diContainer.resolve(UserService);
  const userVMMapper = diContainer.resolve(UserToUserViewModelMapper);
  let organizationId: string;
  let organization: Organization;
  // There is two ways to invoke this function.
  organizationId = event["OrganizationId"] as string;
  if (organizationId) {
    // Either from another lamda function
    organization = await organizationService.fetchByIdInvokedByLambda(
      organizationId
    );
  } else {
    organizationId = getOrganizationId(event.pathParameters?.organizationId);
    const currentUserId =
      (event.requestContext?.authorizer?.jwt?.claims?.["sub"] as string) || "";
    const isAdmin =
      event.requestContext?.authorizer?.jwt?.claims?.["custom:isAdmin"] ===
        "true" || false;
    // Or from ApiGateway
    organization = await organizationService.fetchByIdInvokedByApiGateway(
      organizationId,
      currentUserId,
      isAdmin
    );
  }
  const { JoinedUsers } = organization;
  let users: User[] = [];
  if (JoinedUsers && Array.isArray(JoinedUsers) && JoinedUsers.length > 0) {
    users = await userService.fetchByIds(organization.JoinedUsers);
  }
  return {
    statusCode: 200,
    body: JSON.stringify(userVMMapper.toListDTO(users)),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

function getOrganizationId(organizationId: string | undefined): string {
  if (!organizationId) {
    throw createHttpError(400, "OrganizationId is required");
  }
  return organizationId;
}

const handler = middy(lambdaHandler)
  .use(httpResponseSerializer())
  .use(
    httpErrorHandler({
      fallbackMessage: JSON.stringify({
        message: "Bilinmeyen hata olustu",
      }),
    })
  );

export { handler, lambdaHandler };
