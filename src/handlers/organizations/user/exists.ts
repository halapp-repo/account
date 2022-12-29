import "reflect-metadata";
import "source-map-support/register";
import middy from "@middy/core";
import { diContainer } from "../../../core/di-registry";
import { Context, APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

const lambdaHandler = async function (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Print event
  console.log(JSON.stringify(event));

  return {
    statusCode: 200,
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

const handler = middy(lambdaHandler);

export { handler, lambdaHandler };
