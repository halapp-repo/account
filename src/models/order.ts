import { Type } from "class-transformer";
import { CityType, ExtraCharge, PaymentMethodType } from "@halapp/common";

class OrderItem {
  ProductId: string;
  ProductName?: string;
  Price: number;
  Count: number;
  Unit: string;

  get TotalPrice(): number {
    return this.Count * this.Price;
  }
}

class Order {
  Id: string;
  OrganizationId: string;

  @Type(() => ExtraCharge)
  ExtraCharges?: ExtraCharge[];

  @Type(() => OrderItem)
  Items: OrderItem[];

  PaymentMethodType: PaymentMethodType;

  TotalPrice: number;
}

export { Order, OrderItem };
