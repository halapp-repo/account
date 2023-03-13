import { AccountEventType, PaymentMethodType } from "@halapp/common";

interface OrganizationPaidWithCardV1Payload {
  OrderId: string;
  PaymentMethodType: PaymentMethodType;
  PaidAmount: number;
  CurrentBalance: number;
}

type OrganizationPaidWithCardV1Event = {
  VKN?: string;
  OrgID: string;
  TS: moment.Moment;
  EventType: AccountEventType.OrganizationPaidWithCardV1;
  Payload: OrganizationPaidWithCardV1Payload;
};

export type {
  OrganizationPaidWithCardV1Event,
  OrganizationPaidWithCardV1Payload,
};
