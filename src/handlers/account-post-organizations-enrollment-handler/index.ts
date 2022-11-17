import "reflect-metadata";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpErrorHandler from "@middy/http-error-handler";
import httpResponseSerializer from "@middy/http-response-serializer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { diContainer } from "../../core/di-registry";
import * as yup from "yup";
import schemaValidatorMiddleware from "../../middlewares/schema-validator.middleware";
import { Organization } from "../../models/organization";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2,
} from "aws-lambda";
import { SESService } from "../../services/ses.service";
import OrganizationRepository from "../../repositories/organization.repository";
import { SNSService } from "../../services/sns.service";
import { OrganizationDTO } from "../../models/dto/organization.dto";
import { AccountEventType } from "../../models/account-event-type.enum";
import createHttpError = require("http-errors");

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

  const existingOrganization = await orgRepo.getOrgBy(VKN!);
  console.log(existingOrganization);
  if (existingOrganization) {
    throw createHttpError.BadRequest(
      JSON.stringify({
        message: `vkn: ${VKN} kullanimda`,
      })
    );
  }

  const creatingOrganization = new Organization();
  creatingOrganization.createOrganization({
    organizationName: Name!,
    email: Email!,
    vkn: VKN!,
    phoneNumber: PhoneNumber!,
    companyAddress: CompanyAddress!,
    invoiceAddress: InvoiceAddress!,
  });
  console.log("Organization creating");
  await orgRepo.saveOrg(creatingOrganization);
  // Publish Message with SNS
  console.log("Publish OrganizationCreated message");
  await snsService.publishOrganizationCreatedMessage({
    organizationName: creatingOrganization.Name,
    organizationID: creatingOrganization.ID,
    toEmail: creatingOrganization.Email,
    eventType: AccountEventType.OrganizationCreatedV1,
  });

  // Send Message to Us!!!
  console.log("Creating Message");
  await sesService.sendNewOrganizationCreatedEmail({
    email: creatingOrganization.Email,
    organizationID: creatingOrganization.ID,
    organizationName: creatingOrganization.Name,
    phoneNumber: creatingOrganization.PhoneNumber,
    formattedAddress: `
    ${creatingOrganization.CompanyAddress.AddressLine}
    ${creatingOrganization.CompanyAddress.City}
    ${creatingOrganization.CompanyAddress.County}
    ${creatingOrganization.CompanyAddress.ZipCode}
    ${creatingOrganization.CompanyAddress.Country}`,
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
      fallbackMessage: JSON.stringify({
        message: "Bilinmeyen hata olustu",
      }),
    })
  )
  .use(schemaValidatorMiddleware(inputSchema));

export { handler, lambdaHandler };
