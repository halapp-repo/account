import { AccountEventType, PaymentMethodType } from "@halapp/common";

interface OrganizationWithdrewFromBalanceV1Payload {
  OrderId: string;
  PaymentMethodType: PaymentMethodType;
  WithdrawAmount: number;
  CurrentBalance: number;
}

type OrganizationWithdrewFromBalanceV1Event = {
  VKN?: string;
  OrgID: string;
  TS: moment.Moment;
  EventType: AccountEventType.OrganizationWithdrewFromBalanceV1;
  Payload: OrganizationWithdrewFromBalanceV1Payload;
};

export type {
  OrganizationWithdrewFromBalanceV1Event,
  OrganizationWithdrewFromBalanceV1Payload,
};
