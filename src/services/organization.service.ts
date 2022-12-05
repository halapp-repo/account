import { inject, injectable } from "tsyringe";
import OrganizationRepository from "../repositories/organization.repository";
import { Organization } from "../models/organization";

@injectable()
export class OrganizationService {
  constructor(
    @inject("OrganizationRepository")
    private repo: OrganizationRepository
  ) {}
  async fetchAllOrganizations(): Promise<Organization[]> {
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
}
