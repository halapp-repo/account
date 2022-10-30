import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import createHttpError = require("http-errors");
import { Context as LambdaContext } from "aws-lambda";

const customErrorHandlerMiddleware = (): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> => {
  const onError: middy.MiddlewareFn<
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Error,
    LambdaContext
  > = async (request): Promise<void> => {
    // Your middleware logic
    if (!createHttpError.isHttpError(request.error)) {
      request.error = createHttpError.InternalServerError(
        "Internal Server Error"
      );
    }
  };

  return {
    onError,
  };
};

export default customErrorHandlerMiddleware;
