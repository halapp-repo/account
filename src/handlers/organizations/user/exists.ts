import "reflect-metadata";
import "source-map-support/register";
import middy from "@middy/core";
import { diContainer } from "../../../core/di-registry";
import { Context, APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { OrganizationService } from "../../../services/organization.service";

const lambdaHandler = async function (
  event: any,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Print event
  console.log(JSON.stringify(event));
  const organizationService = diContainer.resolve(OrganizationService);
  const organizationId = event["OrganizationId"] as string;
  const userId = event["UserId"] as string;

  console.log("Calling data is : ", {
    OrganizationId: organizationId,
    UserId: userId,
  });

  const doesOrganizationHasUser = await organizationService.hasUser(
    organizationId,
    userId
  );
  console.log("Result is :", doesOrganizationHasUser);

  return {
    statusCode: 200,
    body: `${doesOrganizationHasUser}`,
    headers: {
      "Content-Type": "application/json",
    },
  };
};

const handler = middy(lambdaHandler);

export { handler, lambdaHandler };
