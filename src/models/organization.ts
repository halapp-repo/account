import { AccountEventType } from "./account-event-type.enum";
import EventSourceAggregate from "./event-source-aggregate";
import { OrganizationEvent } from "./events";
import { OrganizationCreatedV1Event } from "./events/organization-created-v1.event";
import { v4 as uuidv4 } from "uuid";
import { trMoment } from "../utils/timezone";
import { Type } from "class-transformer";
import { UserJoinedV1Event } from "./events/organization-userjoined-v1.event";

class Address {
  AddressLine: string;
  County: string;
  City: string;
  ZipCode: string;
  Country: string;
}

class Organization extends EventSourceAggregate {
  VKN: string;
  ID: string;
  Name: string;

  @Type(() => Address)
  CompanyAddress: Address = new Address();

  @Type(() => Address)
  InvoiceAddress: Address = new Address();

  PhoneNumber: string;
  Email: string;
  Active: boolean;

  JoinedUsers: string[];

  apply(event: OrganizationEvent): void {
    if (event.EventType == AccountEventType.OrganizationCreatedV1) {
      this.whenOrganizationCreatedV1(event);
      return;
    } else if (event.EventType == AccountEventType.UserJoinedV1) {
      this.whenUserJoinedV1(event);
      return;
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
  whenUserJoinedV1(event: UserJoinedV1Event) {
    const { UserID } = event.Payload;
    this.JoinedUsers = [...(this.JoinedUsers || []), UserID];
  }
  static create({
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
  }): Organization {
    const orgId = uuidv4();
    const event = <OrganizationCreatedV1Event>{
      OrgID: orgId,
      VKN: vkn,
      EventType: AccountEventType.OrganizationCreatedV1,
      TS: trMoment(),
      Payload: {
        VKN: vkn,
        OrgID: orgId,
        OrganizationName: organizationName,
        Active: false,
        Email: email,
        PhoneNumber: phoneNumber,
        CompanyAddress: companyAddress,
        InvoiceAddress: invoiceAddress,
      },
    };
    const org = new Organization();
    org.causes(event);
    return org;
  }

  userJoin(userId: string): void {
    if (this.JoinedUsers?.includes(userId)) {
      return;
    }
    const event = <UserJoinedV1Event>{
      OrgID: this.ID,
      EventType: AccountEventType.UserJoinedV1,
      TS: trMoment(),
      Payload: {
        UserID: userId,
      },
    };
    this.causes(event);
  }
}

export { Organization, Address };
