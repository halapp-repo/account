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
import { OrganizationEnrollmentDTO } from "../models/dto/organization-enrollment.dto";
import OrganizationRepository from "../repositories/organization.repository";
import { SNSService } from "../services/sns.service";

interface Event<TBody> extends Omit<APIGatewayProxyEventV2, "body"> {
  body: TBody;
}

const lambdaHandler = async function (
  event: Event<OrganizationEnrollmentDTO>,
  context: Context
): Promise<APIGatewayProxyResult> {
  const sesService = diContainer.resolve(SESService);
  const orgRepo = diContainer.resolve(OrganizationRepository);
  const snsService = diContainer.resolve(SNSService);
  // Create Organization
  const {
    organizationName,
    formattedAddress,
    city,
    county,
    country,
    email,
    phoneNumber,
    zipCode,
  } = event.body;
  const organization = new Organization();
  organization.createOrganization({
    organizationName,
    formattedAddress,
    city,
    county,
    country,
    email,
    phoneNumber,
    zipCode,
  });
  console.log("Organization creating");
  await orgRepo.saveOrg(organization);
  // Publish Message with SNS
  console.log("Sending OrganizationCreated message");
  await snsService.publishOrganizationCreatedMessage({
    organizationName: organization.Name,
    organizationID: organization.ID,
    toEmail: email,
  });
  // Send Message to Us
  console.log("Creating Message");
  await sesService.sendNewOrganizationCreatedEmail({
    email,
    formattedAddress,
    organizationID: organization.ID,
    organizationName,
    phoneNumber,
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
    organizationName: yup.string().required(),
    formattedAddress: yup.string().required(),
    email: yup.string().email().required(),
    phoneNumber: yup.string().required(),
    county: yup.string().required(),
    city: yup.string().required(),
    country: yup.string().required(),
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
