import "reflect-metadata";
import "source-map-support/register";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import httpErrorHandler from "@middy/http-error-handler";
import httpResponseSerializer from "@middy/http-response-serializer";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import { diContainer } from "../../core/di-registry";
import adminValidatorMiddleware from "../../middlewares/admin-validator.middleware";
import { OrganizationService } from "../../services/organization.service";
import { OrgToOrgViewModelMapper } from "../../mappers/org-to-org-viewmodel.mapper";

const lambdaHandler = async function (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  context: Context
): Promise<APIGatewayProxyResult> {
  console.log(JSON.stringify(event, null, 2));
  console.log(JSON.stringify(context, null, 2));

  const orgService = diContainer.resolve(OrganizationService);
  const orgVMMapper = diContainer.resolve(OrgToOrgViewModelMapper);

  const organizationList = await orgService.fetchAllOrganizations();
  console.log(JSON.stringify(organizationList, null, 2));

  const organizationVMList = orgVMMapper.toListDTO(organizationList);

  return {
    statusCode: 200,
    body: JSON.stringify(organizationVMList),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

const handler = middy(lambdaHandler)
  .use(httpResponseSerializer())
  .use(httpErrorHandler())
  .use(cors())
  .use(adminValidatorMiddleware());

export { handler, lambdaHandler };
