import { AccountEventType } from "./account-event-type.enum";
import EventSourceAggregate from "./event-source-aggregate";
import { OrganizationEvent } from "./events";
import { OrganizationCreatedV1Event } from "./events/organization-created-v1.event";
import { v4 as uuidv4 } from "uuid";
import { trMoment } from "../utils/timezone";
import { Type } from "class-transformer";

class Address {
  AddressLine: string;
  County: string;
  City: string;
  ZipCode: string;
  Country: string;
}

class Organization extends EventSourceAggregate {
  VKN: string;
  ID: string = uuidv4();
  Name: string;

  @Type(() => Address)
  CompanyAddress: Address = new Address();

  @Type(() => Address)
  InvoiceAddress: Address = new Address();

  PhoneNumber: string;
  Email: string;
  Active: boolean;

  apply(event: OrganizationEvent): void {
    if (event.EventType == AccountEventType.OrganizationCreatedV1) {
      this.whenOrganizationCreatedV1(event);
    }
  }
  causes(event: OrganizationEvent): void {
    this.Changes.push(event);
    this.apply(event);
  }
  whenOrganizationCreatedV1(event: OrganizationCreatedV1Event) {
    const {
      VKN,
      OrgID,
      OrganizationName,
      Active,
      CompanyAddress,
      InvoiceAddress,
      Email,
      PhoneNumber,
    } = event.Payload;
    this.VKN = VKN;
    this.ID = OrgID;
    this.Name = OrganizationName;
    this.Active = Active;
    this.Email = Email;
    this.PhoneNumber = PhoneNumber;

    this.CompanyAddress.AddressLine = CompanyAddress.AddressLine;
    this.CompanyAddress.City = CompanyAddress.City;
    this.CompanyAddress.Country = CompanyAddress.Country;
    this.CompanyAddress.County = CompanyAddress.County;
    this.CompanyAddress.ZipCode = CompanyAddress.ZipCode;

    this.InvoiceAddress.AddressLine = InvoiceAddress.AddressLine;
    this.InvoiceAddress.City = InvoiceAddress.City;
    this.InvoiceAddress.Country = InvoiceAddress.Country;
    this.InvoiceAddress.County = InvoiceAddress.County;
    this.InvoiceAddress.ZipCode = InvoiceAddress.ZipCode;
  }
  createOrganization({
    vkn,
    organizationName,
    email,
    phoneNumber,
    companyAddress,
    invoiceAddress,
  }: {
    vkn: string;
    organizationName: string;
    email: string;
    phoneNumber: string;
    companyAddress: Address;
    invoiceAddress: Address;
  }) {
    const event = <OrganizationCreatedV1Event>{
      OrgID: this.ID,
      VKN: vkn,
      EventType: AccountEventType.OrganizationCreatedV1,
      TS: trMoment(),
      Payload: {
        VKN: vkn,
        OrgID: this.ID,
        OrganizationName: organizationName,
        Active: false,
        Email: email,
        PhoneNumber: phoneNumber,
        CompanyAddress: companyAddress,
        InvoiceAddress: invoiceAddress,
      },
    };
    this.causes(event);
  }
}

export { Organization, Address };
