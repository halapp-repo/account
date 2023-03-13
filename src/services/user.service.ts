import { inject, injectable } from "tsyringe";
import UserRepository from "../repositories/user.repository";
import { User } from "../models/user";

@injectable()
export class UserService {
  constructor(
    @inject("UserRepository")
    private repo: UserRepository
  ) {}
  async fetchByIds(userIds: string[]): Promise<User[]> {
    const users: User[] = [];
    for (const id of userIds) {
      const user = await this.repo.getUser(id);
      if (!user) {
        throw new Error("Not found User");
      }
      users.push(user);
    }
    return users;
  }
}
