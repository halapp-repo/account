import "reflect-metadata";
import "source-map-support/register";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import createHttpError = require("http-errors");
import httpErrorHandler from "@middy/http-error-handler";
import httpResponseSerializer from "@middy/http-response-serializer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { diContainer } from "../../../../../../core/di-registry";
import schemaValidatorMiddleware from "../../../../../../middlewares/schema-validator.middleware";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import OrganizationRepository from "../../../../../../repositories/organization.repository";
import adminValidatorMiddleware from "../../../../../../middlewares/admin-validator.middleware";
import { OrganizationActivationDTO, inputSchema } from "./input.schema";

interface Event<TBody>
  extends Omit<APIGatewayProxyEventV2WithJWTAuthorizer, "body"> {
  body: TBody;
}

const lambdaHandler = async function (
  event: Event<OrganizationActivationDTO>,
  context: Context
): Promise<APIGatewayProxyResult> {
  const organizationId = getOrganizationId(event.pathParameters?.id);

  const orgRepo = diContainer.resolve(OrganizationRepository);
  // Print event
  console.log(JSON.stringify(event));
  // Create Organization
  const { Activation, Balance } = event.body;

  const existingOrganization = await orgRepo.getOrg(organizationId);
  if (!existingOrganization) {
    throw createHttpError.BadRequest(
      JSON.stringify({
        message: `Sirket: ${organizationId} bulunmamaktadir.`,
      })
    );
  }
  existingOrganization.updateActivationAndBalance(Activation, Balance);
  await orgRepo.saveOrg(existingOrganization);

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
    cors({
      origin: "*",
      methods: "PUT, OPTIONS",
      headers:
        "Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Amz-User-AgentContent-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
    })
  )
  .use(
    httpErrorHandler({
      fallbackMessage: JSON.stringify({
        message: "Bilinmeyen hata olustu",
      }),
    })
  )
  .use(adminValidatorMiddleware())
  .use(schemaValidatorMiddleware(inputSchema));

export { handler, lambdaHandler };
