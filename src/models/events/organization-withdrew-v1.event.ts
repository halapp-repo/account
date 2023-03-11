import { AccountEventType, PaymentMethodType } from "@halapp/common";

interface OrganizationWithdrewV1Payload {
  OrderId: string;
  PaymentMethodType: PaymentMethodType;
  WithdrawAmount: number;
  CurrentBalance: number;
}

type OrganizationWithdrewV1Event = {
  VKN?: string;
  OrgID: string;
  TS: moment.Moment;
  EventType: AccountEventType.OrganizationWithdrewV1;
  Payload: OrganizationWithdrewV1Payload;
};

export type { OrganizationWithdrewV1Event, OrganizationWithdrewV1Payload };
