import { AccountEventType, PaymentMethodType } from "@halapp/common";

interface OrganizationDepositedToBalanceV1Payload {
  OrderId: string;
  PaymentMethodType: PaymentMethodType;
  DepositAmount: number;
  CurrentBalance: number;
}

type OrganizationDepositedToBalanceV1Event = {
  VKN?: string;
  OrgID: string;
  TS: moment.Moment;
  EventType: AccountEventType.OrganizationDepositedToBalanceV1;
  Payload: OrganizationDepositedToBalanceV1Payload;
};

export type {
  OrganizationDepositedToBalanceV1Event,
  OrganizationDepositedToBalanceV1Payload,
};
