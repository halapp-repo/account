import { OrderVM } from "@halapp/common";
import { IMapper } from "./base.mapper";
import { Order } from "../models/order";
import { plainToInstance } from "class-transformer";

export class OrderToOrderViewModelMapper extends IMapper<Order, OrderVM> {
  toDTO(): OrderVM {
    throw new Error("Not Implemented");
  }
  toModel(arg: OrderVM): Order {
    return plainToInstance(Order, {
      Id: arg.Id,
      Items: arg.Items,
      OrganizationId: arg.OrganizationId,
      PaymentMethodType: arg.PaymentMethodType,
      TotalPrice: arg.TotalPrice,
      ExtraCharges: arg.ExtraCharges,
    } as Order);
  }
}
