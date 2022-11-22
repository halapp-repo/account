import { Organization } from "../models/organization";
import { OrganizationViewModel } from "../models/viewmodel/organization.viewmodel";
import { IMapper } from "./base.mapper";

export class OrgToOrgViewModelMapper extends IMapper<
  Organization,
  OrganizationViewModel
> {
  toDTO(arg: Organization): OrganizationViewModel {
    return {
      VKN: arg.VKN,
      ID: arg.ID,
      Active: arg.Active,
      Email: arg.Email,
      Name: arg.Name,
      PhoneNumber: arg.PhoneNumber,
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
    } as OrganizationViewModel;
  }
  toModel(arg: OrganizationViewModel): Organization {
    throw new Error("Not Implemented");
  }
}
