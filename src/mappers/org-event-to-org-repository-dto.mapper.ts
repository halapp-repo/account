import { trMoment } from "../utils/timezone";
import { AccountEventType } from "../models/account-event-type.enum";
import { AccountRepositoryDTO } from "../models/dto/account.repository.dto";
import { OrganizationEvent } from "../models/events";
import { OrganizationCreatedV1Payload } from "../models/events/organization-created-v1.event";
import { IMapper } from "./base.mapper";
import createHttpError = require("http-errors");

export class OrgEventToAcctRepositoryDTOMapper extends IMapper<
  OrganizationEvent,
  AccountRepositoryDTO
> {
  toDTO(arg: OrganizationEvent): AccountRepositoryDTO {
    return <AccountRepositoryDTO>{
      AccountId: `org#${arg.OrgID}`,
      EventType: arg.EventType,
      TS: arg.TS.format(),
      Payload: JSON.stringify(arg.Payload),
    };
  }
  toModel(arg: AccountRepositoryDTO): OrganizationEvent {
    const [_, ID] = arg.AccountId.split("#");
    const eventType =
      AccountEventType[arg.EventType as keyof typeof AccountEventType];
    const ts = trMoment(arg.TS);
    const payload = JSON.parse(arg.Payload);
    if (eventType === AccountEventType.OrganizationCreatedV1) {
      return {
        EventType: eventType,
        OrgID: ID,
        TS: ts,
        Payload: payload as OrganizationCreatedV1Payload,
      };
    } else {
      throw createHttpError.InternalServerError("Unsupported event type");
    }
  }
}
