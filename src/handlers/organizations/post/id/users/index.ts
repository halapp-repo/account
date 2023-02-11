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
import { CreateOrganizationUserDTO, inputSchema } from "./input.schema";
import { SNSService } from "../../../../../services/sns.service";
import { AccountEventType } from "../../../../../models/account-event-type.enum";
import schemaValidatorMiddleware from "../../../../../middlewares/schema-validator.middleware";
import httpJsonBodyParser from "@middy/http-json-body-parser";

interface Event<TBody>
  extends Omit<APIGatewayProxyEventV2WithJWTAuthorizer, "body"> {
  body: TBody;
}

const lambdaHandler = async function (
  event: Event<CreateOrganizationUserDTO>,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Print event
  console.log(JSON.stringify(event));
  const organizationService = diContainer.resolve(OrganizationService);
  const snsService = diContainer.resolve(SNSService);
  let organizationId: string;
  let organization: Organization;

  const email = event.body.Email;
  organizationId = getOrganizationId(event.pathParameters?.organizationId);
  const currentUserId =
    (event.requestContext?.authorizer?.jwt?.claims?.["sub"] as string) || "";

  organization = await organizationService.fetchByIdInvokedByApiGateway(
    organizationId,
    currentUserId
  );
  console.log("Publish OrganizationCreated message");
  console.log(`Email is ${email}`);
  await snsService.publishOrganizationCreatedMessage({
    organizationName: organization.Name,
    organizationID: organization.ID,
    toEmail: event.body.Email,
    eventType: AccountEventType.OrganizationCreatedV1,
  });

  return {
    statusCode: 200,
    body: "OK",
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
