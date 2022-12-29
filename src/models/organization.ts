import { AccountEventType } from "./account-event-type.enum";
import EventSourceAggregate from "./event-source-aggregate";
import { OrganizationEvent } from "./events";
import { OrganizationCreatedV1Event } from "./events/organization-created-v1.event";
import { v4 as uuidv4 } from "uuid";
import { trMoment } from "../utils/timezone";
import { Transform, Type } from "class-transformer";
import { UserJoinedV1Event } from "./events/organization-userjoined-v1.event";
import moment = require("moment");
import { OrganizationActivationToggledV1Event } from "./events/organization-activation-toggled-v1.event";
import { OrganizationUpdatedV1Event } from "./events/organization-updated-v1.event";
import { OrganizationUpdateDeliveryAddressesV1Event } from "./events/organization-update-delivery-addresses-v1.event";

class Address {
  Active?: boolean;
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

  @Type(() => Address)
  DeliveryAddresses: Address[] = [];

  PhoneNumber: string;
  Email: string;
  Active: boolean;

  JoinedUsers: string[];

  @Type(() => String)
  @Transform(({ value }: { value: string }) => trMoment(value), {
    toClassOnly: true,
  })
  CreatedDate: moment.Moment;

  apply(event: OrganizationEvent): void {
    if (event.EventType === AccountEventType.OrganizationCreatedV1) {
      this.whenOrganizationCreatedV1(event);
      return;
    } else if (event.EventType === AccountEventType.UserJoinedV1) {
      this.whenUserJoinedV1(event);
      return;
    } else if (
      event.EventType === AccountEventType.OrganizationActivationToggledV1
    ) {
      this.whenOrganizationActivationToggledV1(event);
      return;
    } else if (event.EventType === AccountEventType.OrganizationUpdatedV1) {
      this.whenOrganizationUpdatedV1(event);
      return;
    } else if (
      event.EventType === AccountEventType.OrganizationUpdateDeliveryAddressesV1
    ) {
      this.whenOrganizationUpdateDeliveryAddressesV1(event);
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

    this.CreatedDate = event.TS;
  }
  whenUserJoinedV1(event: UserJoinedV1Event) {
    const { UserID } = event.Payload;
    this.JoinedUsers = [...(this.JoinedUsers || []), UserID];
  }
  whenOrganizationActivationToggledV1(
    event: OrganizationActivationToggledV1Event
  ) {
    const { Activate } = event.Payload;
    this.Active = Activate;
  }
  whenOrganizationUpdatedV1(event: OrganizationUpdatedV1Event) {
    const {
      Name,
      Email,
      PhoneNumber,
      CompanyAddressLine,
      CompanyCity,
      CompanyCountry,
      CompanyCounty,
      CompanyZipCode,
      InvoiceAddressLine,
      InvoiceCity,
      InvoiceCountry,
      InvoiceCounty,
      InvoiceZipCode,
    } = event.Payload;
    Name && (this.Name = Name);
    Email && (this.Email = Email);
    PhoneNumber && (this.PhoneNumber = PhoneNumber);

    CompanyAddressLine &&
      (this.CompanyAddress.AddressLine = CompanyAddressLine);
    CompanyCity && (this.CompanyAddress.City = CompanyCity);
    CompanyCountry && (this.CompanyAddress.Country = CompanyCountry);
    CompanyCounty && (this.CompanyAddress.County = CompanyCounty);
    CompanyZipCode && (this.CompanyAddress.ZipCode = CompanyZipCode);

    InvoiceAddressLine &&
      (this.InvoiceAddress.AddressLine = InvoiceAddressLine);
    InvoiceCity && (this.InvoiceAddress.City = InvoiceCity);
    InvoiceCountry && (this.InvoiceAddress.Country = InvoiceCountry);
    InvoiceCounty && (this.InvoiceAddress.County = InvoiceCounty);
    InvoiceZipCode && (this.InvoiceAddress.ZipCode = InvoiceZipCode);
  }
  whenOrganizationUpdateDeliveryAddressesV1(
    event: OrganizationUpdateDeliveryAddressesV1Event
  ) {
    this.DeliveryAddresses = [...event.Payload.DeliveryAddresses];
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
  toggleActivationStatus(isActive: boolean): void {
    if (this.Active === isActive) {
      return;
    }
    const event = <OrganizationActivationToggledV1Event>{
      OrgID: this.ID,
      EventType: AccountEventType.OrganizationActivationToggledV1,
      TS: trMoment(),
      Payload: {
        Activate: isActive,
      },
    };
    this.causes(event);
  }
  update(organization: Organization): void {
    const event = <OrganizationUpdatedV1Event>{
      OrgID: this.ID,
      EventType: AccountEventType.OrganizationUpdatedV1,
      TS: trMoment(),
      Payload: {
        ...(this.Name !== organization.Name
          ? { Name: organization.Name }
          : null),
        ...(this.Email !== organization.Email
          ? {
              Email: organization.Email,
            }
          : null),
        ...(this.PhoneNumber !== organization.PhoneNumber
          ? {
              PhoneNumber: organization.PhoneNumber,
            }
          : null),
        //
        ...(this.CompanyAddress.AddressLine !==
        organization.CompanyAddress.AddressLine
          ? {
              CompanyAddressLine: organization.CompanyAddress.AddressLine,
            }
          : null),
        ...(this.CompanyAddress.City !== organization.CompanyAddress.City
          ? {
              CompanyCity: organization.CompanyAddress.City,
            }
          : null),
        ...(this.CompanyAddress.Country !== organization.CompanyAddress.Country
          ? {
              CompanyCountry: organization.CompanyAddress.Country,
            }
          : null),
        ...(this.CompanyAddress.County !== organization.CompanyAddress.County
          ? {
              CompanyCounty: organization.CompanyAddress.County,
            }
          : null),
        ...(this.CompanyAddress.ZipCode !== organization.CompanyAddress.ZipCode
          ? {
              CompanyZipCode: organization.CompanyAddress.ZipCode,
            }
          : null),
        //
        ...(this.InvoiceAddress.AddressLine !==
        organization.InvoiceAddress.AddressLine
          ? {
              InvoiceAddressLine: organization.InvoiceAddress.AddressLine,
            }
          : null),
        ...(this.InvoiceAddress.City !== organization.InvoiceAddress.City
          ? {
              InvoiceCity: organization.InvoiceAddress.City,
            }
          : null),
        ...(this.InvoiceAddress.Country !== organization.InvoiceAddress.Country
          ? {
              InvoiceCountry: organization.InvoiceAddress.Country,
            }
          : null),
        ...(this.InvoiceAddress.County !== organization.InvoiceAddress.County
          ? {
              InvoiceCounty: organization.InvoiceAddress.County,
            }
          : null),
        ...(this.InvoiceAddress.ZipCode !== organization.InvoiceAddress.ZipCode
          ? {
              InvoiceZipCode: organization.InvoiceAddress.ZipCode,
            }
          : null),
      },
    };
    this.causes(event);
  }
  updateDeliveryAddresses(deliveryAddresses: Address[]): void {
    const event = <OrganizationUpdateDeliveryAddressesV1Event>{
      OrgID: this.ID,
      EventType: AccountEventType.OrganizationUpdateDeliveryAddressesV1,
      TS: trMoment(),
      Payload: {
        DeliveryAddresses: deliveryAddresses,
      },
    };
    this.causes(event);
  }
  hasUser(userId: string): boolean {
    return this.JoinedUsers.includes(userId);
  }
}

export { Organization, Address };
