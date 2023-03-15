import "reflect-metadata";
import { SQSEvent, SNSMessage } from "aws-lambda";
import { plainToInstance } from "class-transformer";
import {
  OrderCanceledMessagePayload,
  OrderCreatedMessagePayload,
  OrderItemsUpdatedMessagePayload,
  OrderSQSMessageType,
  OrderVM,
  SQSMessage,
} from "@halapp/common";
import { diContainer } from "../../../../core/di-registry";
import { OrderToOrderViewModelMapper } from "../../../../mappers/order-to-order-viewmodel.mapper";
import { OrganizationService } from "../../../../services/organization.service";
import OrganizationRepository from "../../../../repositories/organization.repository";
import { OrderItem } from "../../../../models/order";

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
    const message = JSON.parse(
      rawMessage.Message
    ) as SQSMessage<OrderSQSMessageType>;
    if (message.Type === OrderSQSMessageType.OrderCreated) {
      const { Order: orderPayload } =
        message.Payload as OrderCreatedMessagePayload;
      const orderVM = plainToInstance(OrderVM, orderPayload);
      const order = orderVMMapper.toModel(orderVM);
      const organization = await service.fetchByIdInvokedByLambda(
        order.OrganizationId
      );
      organization.withdrawFromBalance(order.Id, order.TotalPrice);
      await repo.saveOrg(organization);
    } else if (message.Type === OrderSQSMessageType.OrderCanceled) {
      const { Order: orderPayload } =
        message.Payload as OrderCanceledMessagePayload;
      const orderVM = plainToInstance(OrderVM, orderPayload);
      const order = orderVMMapper.toModel(orderVM);
      const organization = await service.fetchByIdInvokedByLambda(
        order.OrganizationId
      );
      organization.depositToBalance(
        order.Id,
        order.PaymentMethodType,
        order.TotalPrice
      );
      await repo.saveOrg(organization);
    } else if (message.Type === OrderSQSMessageType.OrderItemsUpdated) {
      const { Order: orderPayload, DeletedItems: deletedItemsPayload } =
        message.Payload as OrderItemsUpdatedMessagePayload;
      const orderVM = plainToInstance(OrderVM, orderPayload);
      const order = orderVMMapper.toModel(orderVM);
      const organization = await service.fetchByIdInvokedByLambda(
        order.OrganizationId
      );
      if (deletedItemsPayload && deletedItemsPayload.length > 0) {
        const deletedItems = plainToInstance(OrderItem, deletedItemsPayload);
        const totalDeletedItemPrice = deletedItems.reduce((acc, curr) => {
          return acc + curr.TotalPrice;
        }, 0);
        console.log("Total deleted items price is", totalDeletedItemPrice);
        organization.depositToBalance(
          order.Id,
          order.PaymentMethodType,
          totalDeletedItemPrice
        );
      }

      await repo.saveOrg(organization);
    }
  }
}
