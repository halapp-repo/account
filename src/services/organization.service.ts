import { inject, injectable } from "tsyringe";
import OrganizationRepository from "../repositories/organization.repository";
import { Organization } from "../models/organization";
import createHttpError = require("http-errors");

@injectable()
export class OrganizationService {
  constructor(
    @inject("OrganizationRepository")
    private repo: OrganizationRepository
  ) {}
  async fetchAll(): Promise<Organization[]> {
    const organizationIds = await this.repo.getAllOrgIds();
    const organizationList: Organization[] = [];
    for (const id of organizationIds || []) {
      const org = await this.repo.getOrg(id);
      if (org) {
        organizationList.push(org);
      }
    }
    return organizationList;
  }
  async hasUser(organizationId: string, userId: string): Promise<boolean> {
    const organization = await this.repo.getOrg(organizationId);
    if (!organization) {
      throw new createHttpError.BadRequest();
    }
    return organization.hasUser(userId);
  }
  async fetchById(id: string): Promise<Organization> {
    const organization = await this.repo.getOrg(id);
    if (!organization) {
      throw new createHttpError.NotFound();
    }
    return organization;
  }
}
