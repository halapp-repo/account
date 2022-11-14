import { AccountEventType } from "../account-event-type.enum";
import { Address } from "../organization";

interface OrganizationCreatedV1Payload {
  VKN: string;
  OrgID: string;
  OrganizationName: string;
  PhoneNumber: string;
  Email: string;
  Active: boolean;

  CompanyAddress: Address;
  InvoiceAddress: Address;
}

type OrganizationCreatedV1Event = {
  VKN: string;
  OrgID: string;
  TS: moment.Moment;
  EventType: AccountEventType.OrganizationCreatedV1;
  Payload: OrganizationCreatedV1Payload;
};

export type { OrganizationCreatedV1Event, OrganizationCreatedV1Payload };
