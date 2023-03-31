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
import { ByEvent, inputSchema } from "./input.schema";
import schemaValidatorMiddleware from "../../../../middlewares/schema-validator.middleware";
import { S3Service } from "../../../../services/s3.service";
import httpJsonBodyParser from "@middy/http-json-body-parser";

interface Event<TBody>
  extends Omit<
    APIGatewayProxyEventV2WithJWTAuthorizer,
    "queryStringParameters"
  > {
  queryStringParameters: TBody;
}

const lambdaHandler = async function (
  event: Event<ByEvent>,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Print event
  console.log(JSON.stringify(event));
  const s3Service = diContainer.resolve(S3Service);

  const fileType = event.queryStringParameters.fileType;
  const filePath = event.queryStringParameters.filePath;

  const presignPost = await s3Service.generatePresignPost({
    filePath: filePath,
    fileType: fileType,
  });

  // There is two ways to invoke this function.

  return {
    statusCode: 200,
    body: JSON.stringify(presignPost),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  };
};

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
