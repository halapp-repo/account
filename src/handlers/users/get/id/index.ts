import "reflect-metadata";
import "source-map-support/register";
import middy from "@middy/core";
import { diContainer } from "../../../../core/di-registry";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import { UserService } from "../../../../services/user.service";
import httpResponseSerializer from "@middy/http-response-serializer";
import httpErrorHandler from "@middy/http-error-handler";
import createHttpError = require("http-errors");
import { UserToUserViewModelMapper } from "../../../../mappers/user-to-user-viewmodel.mapper";
import { User } from "../../../../models/user";

const lambdaHandler = async function (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Print event
  console.log(JSON.stringify(event));
  const userId = getUserId(event.pathParameters?.userId);

  const userService = diContainer.resolve(UserService);
  const userVMMapper = diContainer.resolve(UserToUserViewModelMapper);
  const users: User[] = await userService.fetchByIds([userId]);

  return {
    statusCode: 200,
    body: JSON.stringify(userVMMapper.toDTO(users[0])),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

function getUserId(userId: string | undefined): string {
  if (!userId) {
    throw createHttpError(400, "UserId is required");
  }
  return userId;
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
