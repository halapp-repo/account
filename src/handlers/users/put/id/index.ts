import "reflect-metadata";
import "source-map-support/register";
import middy from "@middy/core";
import { diContainer } from "../../../../core/di-registry";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import httpResponseSerializer from "@middy/http-response-serializer";
import httpErrorHandler from "@middy/http-error-handler";
import createHttpError = require("http-errors");
import { UpdateUserDTO, inputSchema } from "./input.schema";
import { AccountEventType, UserVM } from "@halapp/common";
import schemaValidatorMiddleware from "../../../../middlewares/schema-validator.middleware";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { UserService } from "../../../../services/user.service";
import { UserToUserViewModelMapper } from "../../../../mappers/user-to-user-viewmodel.mapper";

interface Event<TBody>
  extends Omit<APIGatewayProxyEventV2WithJWTAuthorizer, "body"> {
  body: TBody;
}

const lambdaHandler = async function (
  event: Event<UpdateUserDTO>,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Print event
  console.log(JSON.stringify(event));
  const userService = diContainer.resolve(UserService);
  const userVMMapper = diContainer.resolve(UserToUserViewModelMapper);
  const userId = getUserId(event.pathParameters?.userId);
  const currentUserId =
    (event.requestContext?.authorizer?.jwt?.claims?.["sub"] as string) || "";

  if (!currentUserId || currentUserId !== userId) {
    throw createHttpError.Unauthorized();
  }

  const updatedUser = await userService.update({
    ID: userId,
    FirstName: event.body.FirstName,
    LastName: event.body.LastName,
    PhoneNumber: event.body.PhoneNumber,
  });

  return {
    statusCode: 200,
    body: JSON.stringify(userVMMapper.toDTO(updatedUser)),
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
  .use(httpJsonBodyParser())
  .use(httpResponseSerializer())
  .use(
    httpErrorHandler({
      fallbackMessage: JSON.stringify({
        message: "Bilinmeyen hata olustu",
      }),
    })
  )
  .use(schemaValidatorMiddleware(inputSchema));

export { handler, lambdaHandler };
