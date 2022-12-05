import { AccountEventType } from "../account-event-type.enum";

interface OrganizationUpdatedV1Payload {
  Name?: string;
  Email?: string;
  PhoneNumber?: string;

  CompanyAddressLine?: string;
  CompanyCounty?: string;
  CompanyCity?: string;
  CompanyZipCode?: string;
  CompanyCountry?: string;

  InvoiceAddressLine?: string;
  InvoiceCounty?: string;
  InvoiceCity?: string;
  InvoiceZipCode?: string;
  InvoiceCountry?: string;
}

type OrganizationUpdatedV1Event = {
  VKN?: string;
  OrgID: string;
  TS: moment.Moment;
  EventType: AccountEventType.OrganizationUpdatedV1;
  Payload: OrganizationUpdatedV1Payload;
};

export type { OrganizationUpdatedV1Event, OrganizationUpdatedV1Payload };
