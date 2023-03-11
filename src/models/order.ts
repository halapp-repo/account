import { Type } from "class-transformer";
import { CityType, PaymentMethodType } from "@halapp/common";

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

  @Type(() => OrderItem)
  Items: OrderItem[];

  PaymentMethodType: PaymentMethodType;

  get TotalPrice(): number {
    return this.Items.reduce((acc, curr) => {
      return acc + curr.TotalPrice;
    }, 0);
  }
}

export { Order, OrderItem };
