import "reflect-metadata";
import "source-map-support/register";
import middy from "@middy/core";
import { diContainer } from "../../../../core/di-registry";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import { OrganizationService } from "../../../../services/organization.service";
import { OrgToOrgViewModelMapper } from "../../../../mappers/org-to-org-viewmodel.mapper";
import { Organization } from "../../../../models/organization";
import httpResponseSerializer from "@middy/http-response-serializer";
import httpErrorHandler from "@middy/http-error-handler";
import createHttpError = require("http-errors");
import { ByEvent, inputSchema } from "./input.schema";
import * as qs from "qs";
import schemaValidatorMiddleware from "../../../../middlewares/schema-validator.middleware";
import { AccountEventType } from "@halapp/common";

interface Event<TBody>
  extends Omit<
    APIGatewayProxyEventV2WithJWTAuthorizer,
    "queryStringParameters"
  > {
  queryStringParameters: TBody;
}

const lambdaHandler = async function (
  event: any | Event<ByEvent>,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Print event
  console.log(JSON.stringify(event));
  const organizationService = diContainer.resolve(OrganizationService);
  const orgVMMapper = diContainer.resolve(OrgToOrgViewModelMapper);
  let organizationId: string;
  let organization: Organization;
  const includeEvents = event?.queryStringParameters?.includeEvents || false;
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

  return {
    statusCode: 200,
    body: JSON.stringify(orgVMMapper.toDTO(organization, includeEvents)),
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
  )
  .use(schemaValidatorMiddleware(inputSchema));

export { handler, lambdaHandler };
