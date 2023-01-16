import "reflect-metadata";
import "source-map-support/register";
import middy from "@middy/core";
import { diContainer } from "../../../../core/di-registry";
import { Context, APIGatewayProxyResult } from "aws-lambda";
import { OrganizationService } from "../../../../services/organization.service";
import { OrgToOrgViewModelMapper } from "../../../../mappers/org-to-org-viewmodel.mapper";

const lambdaHandler = async function (
  event: any,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Print event
  console.log(JSON.stringify(event));
  const organizationService = diContainer.resolve(OrganizationService);
  const orgVMMapper = diContainer.resolve(OrgToOrgViewModelMapper);
  const organizationId = event["OrganizationId"] as string;

  console.log(
    "Calling data is : ",
    JSON.stringify({
      OrganizationId: organizationId,
    })
  );

  const organization = await organizationService.fetchById(organizationId);

  return {
    statusCode: 200,
    body: JSON.stringify(orgVMMapper.toDTO(organization)),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

const handler = middy(lambdaHandler);

export { handler, lambdaHandler };
