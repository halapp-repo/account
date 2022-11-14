import "reflect-metadata";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpErrorHandler from "@middy/http-error-handler";
import httpResponseSerializer from "@middy/http-response-serializer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { diContainer } from "../core/di-registry";
import * as yup from "yup";
import schemaValidatorMiddleware from "../middlewares/schema-validator.middleware";
import { Organization } from "../models/organization";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2,
} from "aws-lambda";
import { SESService } from "../services/ses.service";
import OrganizationRepository from "../repositories/organization.repository";
import { SNSService } from "../services/sns.service";
import { OrganizationDTO } from "../models/dto/organization.dto";

interface Event<TBody> extends Omit<APIGatewayProxyEventV2, "body"> {
  body: TBody;
}

const lambdaHandler = async function (
  event: Event<OrganizationDTO>,
  context: Context
): Promise<APIGatewayProxyResult> {
  const sesService = diContainer.resolve(SESService);
  const orgRepo = diContainer.resolve(OrganizationRepository);
  const snsService = diContainer.resolve(SNSService);
  // Print event
  console.log(JSON.stringify(event));
  // Create Organization
  const { Name, Email, PhoneNumber, VKN, CompanyAddress, InvoiceAddress } =
    event.body;
  const organization = new Organization();
  organization.createOrganization({
    organizationName: Name!,
    email: Email!,
    vkn: VKN!,
    phoneNumber: PhoneNumber!,
    companyAddress: CompanyAddress!,
    invoiceAddress: InvoiceAddress!,
  });
  console.log("Organization creating");
  await orgRepo.saveOrg(organization);
  // Publish Message with SNS
  console.log("Publish OrganizationCreated message");
  await snsService.publishOrganizationCreatedMessage({
    organizationName: organization.Name,
    organizationID: organization.ID,
    toEmail: organization.Email,
  });
  // Send Message to Us!!!
  console.log("Creating Message");
  await sesService.sendNewOrganizationCreatedEmail({
    email: organization.Email,
    organizationID: organization.ID,
    organizationName: organization.Name,
    phoneNumber: organization.PhoneNumber,
    formattedAddress: `
    ${organization.CompanyAddress.AddressLine}
    ${organization.CompanyAddress.City}
    ${organization.CompanyAddress.County}
    ${organization.CompanyAddress.ZipCode}
    ${organization.CompanyAddress.Country}`,
  });
  return {
    statusCode: 200,
    body: JSON.stringify(event.body),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

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
      fallbackMessage: "Bilinmeyen hata",
    })
  )
  .use(schemaValidatorMiddleware(inputSchema));

export { handler, lambdaHandler };
