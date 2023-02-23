import { AccountEventType } from "@halapp/common";
import { Address } from "../organization";

interface OrganizationUpdateDeliveryAddressesV1Payload {
  DeliveryAddresses: Address[];
}

type OrganizationUpdateDeliveryAddressesV1Event = {
  VKN?: string;
  OrgID: string;
  TS: moment.Moment;
  EventType: AccountEventType.OrganizationUpdateDeliveryAddressesV1;
  Payload: OrganizationUpdateDeliveryAddressesV1Payload;
};

export type {
  OrganizationUpdateDeliveryAddressesV1Event,
  OrganizationUpdateDeliveryAddressesV1Payload,
};
