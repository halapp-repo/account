import { User } from "../models/user";
import { UserVM } from "@halapp/common";
import { IMapper } from "./base.mapper";

export class UserToUserViewModelMapper extends IMapper<User, UserVM> {
  toDTO(arg: User): UserVM {
    return {
      Active: arg.Active,
      Email: arg.Email,
      ID: arg.ID,
      BaseImageUrl: arg.BaseImageUrl,
      FirstName: arg.FirstName,
      LastName: arg.LastName,
      PhoneNumber: arg.PhoneNumber,
    } as UserVM;
  }
  toModel(arg: UserVM): User {
    throw new Error("Not Implemented");
  }
}
