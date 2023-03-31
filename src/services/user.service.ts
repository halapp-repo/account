import { inject, injectable } from "tsyringe";
import UserRepository from "../repositories/user.repository";
import { User } from "../models/user";
import createHttpError = require("http-errors");

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
  async update({
    ID,
    FirstName,
    LastName,
    PhoneNumber,
    BaseImageUrl,
  }: {
    ID: string;
    FirstName?: string;
    LastName?: string;
    PhoneNumber?: string;
    BaseImageUrl?: string;
  }): Promise<User> {
    const user = await this.repo.getUser(ID);
    if (!user) {
      throw createHttpError.BadRequest();
    }
    user.update({ FirstName, LastName, PhoneNumber, BaseImageUrl });
    await this.repo.saveUser(user);
    return user;
  }
}
