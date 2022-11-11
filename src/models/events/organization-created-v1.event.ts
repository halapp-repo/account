import { AccountEventType } from "../account-event-type.enum";

interface OrganizationCreatedV1Payload {
  OrgID: string;
  OrganizationName: string;
  Address: string;
  County: string;
  City: string;
  ZipCode: string;
  Country: string;
  PhoneNumber: string;
  Email: string;
  Active: boolean;
}

type OrganizationCreatedV1Event = {
  OrgID: string;
  TS: moment.Moment;
  EventType: AccountEventType.OrganizationCreatedV1;
  Payload: OrganizationCreatedV1Payload;
};

export type { OrganizationCreatedV1Event, OrganizationCreatedV1Payload };
