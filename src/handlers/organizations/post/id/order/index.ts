import "reflect-metadata";
import { SQSEvent, SNSMessage } from "aws-lambda";
import { plainToInstance } from "class-transformer";
import { OrderVM } from "@halapp/common";
import { diContainer } from "../../../../../core/di-registry";
import { OrderToOrderViewModelMapper } from "../../../../../mappers/order-to-order-viewmodel.mapper";
import { OrganizationService } from "../../../../../services/organization.service";
import OrganizationRepository from "../../../../../repositories/organization.repository";

export async function handler(event: SQSEvent) {
  console.log(JSON.stringify(event, null, 2));
  const orderVMMapper = diContainer.resolve(OrderToOrderViewModelMapper);
  const service = diContainer.resolve(OrganizationService);
  const repo = diContainer.resolve(OrganizationRepository);

  for (const record of event.Records) {
    const { body } = record;
    const rawMessage = JSON.parse(body) as SNSMessage;
    // Add Record to Signup DB
    console.log(rawMessage.Message);
    const orderVM = plainToInstance(OrderVM, JSON.parse(rawMessage.Message));
    const order = orderVMMapper.toModel(orderVM);
    const organization = await service.fetchByIdInvokedByLambda(
      order.OrganizationId
    );
    organization.withdraw(order.Id, order.PaymentMethodType, order.TotalPrice);
    await repo.saveOrg(organization);
  }
}
