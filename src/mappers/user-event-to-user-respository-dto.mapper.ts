import { trMoment } from "../utils/timezone";
import { AccountEventType } from "../models/account-event-type.enum";
import { UserRepositoryDTO } from "../models/dto/account.repository.dto";
import { UserEvent } from "../models/events";
import { UserCreatedV1Payload } from "../models/events/user-created-v1.event";
import { IMapper } from "./base.mapper";
import createHttpError = require("http-errors");
import {
  UserJoinedOrganizationV1Event,
  UserJoinedOrganizationV1Payload,
} from "../models/events/user-joined-organization-v1.event";

export class UserEventToUserRepositoryDTOMapper extends IMapper<
  UserEvent,
  UserRepositoryDTO
> {
  toDTO(arg: UserEvent): UserRepositoryDTO {
    return <UserRepositoryDTO>{
      AccountID: `user#${arg.UserID}`,
      EventType: arg.EventType,
      TS: arg.TS.format(),
      Payload: JSON.stringify(arg.Payload),
      ...(arg.Email
        ? {
            Email: arg.Email,
          }
        : null),
    };
  }
  toModel(arg: UserRepositoryDTO): UserEvent {
    const [_, ID] = arg.AccountID.split("#");
    const eventType =
      AccountEventType[arg.EventType as keyof typeof AccountEventType];
    const ts = trMoment(arg.TS);
    const payload = JSON.parse(arg.Payload);
    if (eventType === AccountEventType.UserCreatedV1) {
      return {
        Email: arg.Email!,
        EventType: eventType,
        UserID: ID,
        TS: ts,
        Payload: payload as UserCreatedV1Payload,
      };
    } else if (eventType === AccountEventType.UserJoinedV1) {
      return {
        UserID: ID,
        EventType: eventType,
        Payload: payload as UserJoinedOrganizationV1Payload,
        TS: ts,
      } as UserJoinedOrganizationV1Event;
    } else {
      throw createHttpError.InternalServerError("Unsupported event type");
    }
  }
}
