import { Organization } from "../models/organization";
import {
  AccountEventType,
  AccountEventVM,
  AddressVM,
  OrganizationVM,
} from "@halapp/common";
import { IMapper } from "./base.mapper";

export class OrgToOrgViewModelMapper extends IMapper<
  Organization,
  OrganizationVM
> {
  toDTO(
    arg: Organization,
    includeEvents?: boolean,
    eventTypes?: AccountEventType[]
  ): OrganizationVM {
    return {
      VKN: arg.VKN,
      ID: arg.ID,
      Active: arg.Active,
      Email: arg.Email,
      Name: arg.Name,
      PhoneNumber: arg.PhoneNumber,
      Balance: arg.Balance,
      CreditLimit: arg.CreditLimit,
      CompanyAddress: {
        AddressLine: arg.CompanyAddress.AddressLine,
        City: arg.CompanyAddress.City,
        Country: arg.CompanyAddress.Country,
        County: arg.CompanyAddress.County,
        ZipCode: arg.CompanyAddress.ZipCode,
      },
      InvoiceAddress: {
        AddressLine: arg.InvoiceAddress.AddressLine,
        City: arg.InvoiceAddress.City,
        Country: arg.InvoiceAddress.Country,
        County: arg.InvoiceAddress.County,
        ZipCode: arg.InvoiceAddress.ZipCode,
      },
      CreatedDate: arg.CreatedDate.format(),
      JoinedUsers: arg.JoinedUsers,
      DeliveryAddresses: arg.DeliveryAddresses.map(
        (a) =>
          ({
            AddressLine: a.AddressLine,
            City: a.City,
            Country: a.Country,
            County: a.County,
            ZipCode: a.ZipCode,
            Active: a.Active,
          } as AddressVM)
      ),
      ...(includeEvents
        ? {
            Events: arg.RetroEvents.filter(
              (e) =>
                e.EventType === AccountEventType.OrganizationCreatedV1 ||
                e.EventType ===
                  AccountEventType.OrganizationDepositedToBalanceV1 ||
                e.EventType === AccountEventType.OrganizationPaidWithCardV1 ||
                e.EventType ===
                  AccountEventType.OrganizationWithdrewFromBalanceV1
            ).map((e) => {
              return {
                EventType: e.EventType,
                Payload: JSON.stringify(e.Payload),
                TS: e.TS.format(),
              } as AccountEventVM;
            }),
          }
        : null),
    } as OrganizationVM;
  }
  toModel(arg: OrganizationVM): Organization {
    throw new Error("Not Implemented");
  }
}
