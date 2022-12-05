import "reflect-metadata";
import "source-map-support/register";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpErrorHandler from "@middy/http-error-handler";
import httpResponseSerializer from "@middy/http-response-serializer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { diContainer } from "../../core/di-registry";
import * as yup from "yup";
import schemaValidatorMiddleware from "../../middlewares/schema-validator.middleware";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import OrganizationRepository from "../../repositories/organization.repository";
import { OrganizationDTO } from "../../models/dto/organization.dto";
import createHttpError = require("http-errors");
import { OrgToOrgViewModelMapper } from "../../mappers/org-to-org-viewmodel.mapper";
import { Organization } from "../../models/organization";

interface Event<TBody>
  extends Omit<APIGatewayProxyEventV2WithJWTAuthorizer, "body"> {
  body: TBody;
}

const lambdaHandler = async function (
  event: Event<OrganizationDTO>,
  context: Context
): Promise<APIGatewayProxyResult> {
  const organizationId = getOrganizationId(
    event.pathParameters?.organizationId
  );
  const orgVMMapper = diContainer.resolve(OrgToOrgViewModelMapper);
  const orgRepo = diContainer.resolve(OrganizationRepository);
  // Print event
  console.log(JSON.stringify(event));
  // Find Organization
  const { Name, Email, PhoneNumber, VKN, CompanyAddress, InvoiceAddress } =
    event.body;
  const existingOrganization = await orgRepo.getOrg(organizationId);
  console.log(existingOrganization);
  if (!existingOrganization) {
    throw createHttpError.BadRequest(
      JSON.stringify({
        message: `Sirket: ${organizationId} bulunmamaktadir`,
      })
    );
  }
  existingOrganization.update(
    Organization.create({
      organizationName: Name!,
      email: Email!,
      vkn: VKN!,
      phoneNumber: PhoneNumber!,
      companyAddress: CompanyAddress!,
      invoiceAddress: InvoiceAddress!,
    })
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
    VKN: yup.string().required(),
    Name: yup.string().required(),
    Email: yup.string().email().required(),
    PhoneNumber: yup.string().required(),
    CompanyAddress: yup.object({
      AddressLine: yup.string().required(),
      County: yup.string().required(),
      City: yup.string().required(),
      ZipCode: yup.string().required(),
      Country: yup.string().required(),
    }),
    InvoiceAddress: yup.object({
      AddressLine: yup.string().required(),
      County: yup.string().required(),
      City: yup.string().required(),
      ZipCode: yup.string().required(),
      Country: yup.string().required(),
    }),
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
