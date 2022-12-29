import "reflect-metadata";
import "source-map-support/register";
import * as yup from "yup";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpErrorHandler from "@middy/http-error-handler";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpResponseSerializer from "@middy/http-response-serializer";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import { diContainer } from "../../core/di-registry";
import OrganizationRepository from "../../repositories/organization.repository";
import createHttpError = require("http-errors");
import { OrgToOrgViewModelMapper } from "../../mappers/org-to-org-viewmodel.mapper";
import schemaValidatorMiddleware from "../../middlewares/schema-validator.middleware";
import { OrganizationAddressDTO } from "../../models/dto/organization.dto";
import { Address } from "../../models/organization";

interface Event<TBody>
  extends Omit<APIGatewayProxyEventV2WithJWTAuthorizer, "body"> {
  body: TBody;
}

const lambdaHandler = async function (
  event: Event<{ DeliveryAddresses: OrganizationAddressDTO[] }>,
  context: Context
): Promise<APIGatewayProxyResult> {
  console.log(JSON.stringify(event, null, 2));
  console.log(JSON.stringify(context, null, 2));

  const organizationId = getOrganizationId(
    event.pathParameters?.organizationId
  );

  const orgRepo = diContainer.resolve(OrganizationRepository);
  const orgVMMapper = diContainer.resolve(OrgToOrgViewModelMapper);

  const { DeliveryAddresses } = event.body;

  const currentUserId = event.requestContext.authorizer.jwt.claims["sub"];
  if (!currentUserId) {
    throw createHttpError.Unauthorized();
  }
  const existingOrganization = await orgRepo.getOrg(organizationId);
  if (!existingOrganization) {
    throw createHttpError.BadRequest(
      JSON.stringify({
        message: `Sirket: ${organizationId} bulunmamaktadir`,
      })
    );
  }
  if (!existingOrganization.hasUser(currentUserId as string)) {
    throw createHttpError.Unauthorized();
  }
  existingOrganization.updateDeliveryAddresses(
    DeliveryAddresses.map(
      (d) =>
        ({
          AddressLine: d.AddressLine,
          City: d.City,
          Country: d.Country,
          County: d.County,
          ZipCode: d.ZipCode,
          Active: d.Active,
        } as Address)
    )
  );

  await orgRepo.saveOrg(existingOrganization);

  return {
    statusCode: 200,
    body: JSON.stringify(orgVMMapper.toDTO(existingOrganization)),
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

const inputSchema = {
  body: yup.object({
    DeliveryAddresses: yup.array().of(
      yup.object().shape({
        Active: yup.boolean().optional(),
        AddressLine: yup.string().required(),
        County: yup.string().required(),
        City: yup.string().required(),
        ZipCode: yup.string().required(),
        Country: yup.string().required(),
      })
    ),
  }),
};

const handler = middy(lambdaHandler)
  .use(httpJsonBodyParser())
  .use(httpResponseSerializer())
  .use(
    cors({
      origin: "*",
      methods: "GET, PUT, PATCH, POST, DELETE, OPTIONS",
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
  .use(schemaValidatorMiddleware(inputSchema));

export { handler, lambdaHandler };
