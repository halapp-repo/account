import { AccountEventType } from "./account-event-type.enum";
import EventSourceAggregate from "./event-source-aggregate";
import { OrganizationEvent } from "./events";
import { OrganizationCreatedV1Event } from "./events/organization-created-v1.event";
import { v4 as uuidv4 } from "uuid";
import { trMoment } from "../utils/timezone";

class Address {
  FormattedAddress: string;
  County: string;
  City: string;
  ZipCode: string;
  Country: string;
}

class Organization extends EventSourceAggregate {
  ID: string = uuidv4();
  Name: string;
  Address: Address = new Address();
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
      OrgID,
      OrganizationName,
      Active,
      Address,
      City,
      Country,
      County,
      Email,
      PhoneNumber,
      ZipCode,
    } = event.Payload;
    this.ID = OrgID;
    this.Name = OrganizationName;
    this.Active = Active;
    this.Address.FormattedAddress = Address;
    this.Address.City = City;
    this.Address.Country = Country;
    this.Address.County = County;
    this.Email = Email;
    this.PhoneNumber = PhoneNumber;
    this.Address.ZipCode = ZipCode;
  }
  createOrganization({
    organizationName,
    email,
    phoneNumber,
    formattedAddress,
    city,
    county,
    country,
    zipCode,
  }: {
    organizationName: string;
    email: string;
    phoneNumber: string;
    formattedAddress: string;
    city: string;
    county: string;
    country: string;
    zipCode: string;
  }) {
    const event = <OrganizationCreatedV1Event>{
      OrgID: this.ID,
      EventType: AccountEventType.OrganizationCreatedV1,
      TS: trMoment(),
      Payload: {
        Active: false,
        OrganizationName: organizationName,
        Email: email,
        PhoneNumber: phoneNumber,
        Address: formattedAddress,
        City: city,
        Country: country,
        County: county,
        ZipCode: zipCode,
        OrgID: this.ID,
      },
    };
    this.causes(event);
  }
}

export { Organization };
