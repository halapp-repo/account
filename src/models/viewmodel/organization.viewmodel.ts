interface AddressViewModel {
  AddressLine: string;
  County: string;
  City: string;
  ZipCode: string;
  Country: string;
}

interface OrganizationViewModel {
  VKN: string;
  ID: string;
  Name: string;
  PhoneNumber: string;
  Email: string;
  Active: boolean;

  CompanyAddress: AddressViewModel;
  InvoiceAddress: AddressViewModel;

  JoinedUsers: string[];

  CreatedDate: string;
}

export { OrganizationViewModel };
