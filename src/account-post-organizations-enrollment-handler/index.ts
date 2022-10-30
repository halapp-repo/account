import "reflect-metadata";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpErrorHandler from "@middy/http-error-handler";
import httpResponseSerializer from "@middy/http-response-serializer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { diContainer } from "../core/di-registry";
import * as yup from "yup";
import schemaValidatorMiddleware from "../middlewares/schema-validator.middleware";
import customErrorHandler from "../middlewares/custom-error-handler.middleware";

import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2,
} from "aws-lambda";
import { SESService } from "../services/ses.service";
import { OrganizationEnrollmentDTO } from "../models/dto/organization-enrollment.dto";

interface Event<TBody> extends Omit<APIGatewayProxyEventV2, "body"> {
  body: TBody;
}

const lambdaHandler = async function (
  event: Event<OrganizationEnrollmentDTO>,
  context: Context
): Promise<APIGatewayProxyResult> {
  const sesService = diContainer.resolve(SESService);
  await sesService.sendOrganizationEnrollmentEmail(event.body);
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
  .use(schemaValidatorMiddleware(inputSchema))
  .use(httpErrorHandler())
  .use(
    cors({
      origin: "*",
      methods: "GET, PUT, PATCH, POST, DELETE, OPTIONS",
      headers:
        "Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Amz-User-AgentContent-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
    })
  );

export { handler, lambdaHandler };
