import { Organization } from "../models/organization";
import { User } from "../models/user";
import { OrganizationViewModel } from "../models/viewmodel/organization.viewmodel";
import { UserViewModel } from "../models/viewmodel/user.viewmode";
import { IMapper } from "./base.mapper";

export class UserToUserViewModelMapper extends IMapper<User, UserViewModel> {
  toDTO(arg: User): UserViewModel {
    return {
      Active: arg.Active,
      Email: arg.Email,
      ID: arg.ID,
    } as UserViewModel;
  }
  toModel(arg: UserViewModel): User {
    throw new Error("Not Implemented");
  }
}
