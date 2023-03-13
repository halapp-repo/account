import { trMoment } from "../utils/timezone";
import { AccountEventType } from "@halapp/common";
import { OrganizationRepositoryDTO } from "../models/dto/account.repository.dto";
import { OrganizationEvent } from "../models/events";
import { OrganizationCreatedV1Payload } from "../models/events/organization-created-v1.event";
import { IMapper } from "./base.mapper";
import createHttpError = require("http-errors");
import { UserJoinedV1Payload } from "../models/events/organization-userjoined-v1.event";
import { OrganizationActivationToggledV1Payload } from "../models/events/organization-activation-toggled-v1.event";
import { OrganizationUpdatedV1Payload } from "../models/events/organization-updated-v1.event";
import { OrganizationUpdateDeliveryAddressesV1Payload } from "../models/events/organization-update-delivery-addresses-v1.event";
import { OrganizationActivationToggledV2Payload } from "../models/events/organization-activation-toggled-v2.event";

export class OrgEventToOrgRepositoryDTOMapper extends IMapper<
  OrganizationEvent,
  OrganizationRepositoryDTO
> {
  toDTO(arg: OrganizationEvent): OrganizationRepositoryDTO {
    return <OrganizationRepositoryDTO>{
      AccountID: `org#${arg.OrgID}`,
      EventType: arg.EventType,
      TS: arg.TS.format(),
      Payload: JSON.stringify(arg.Payload),
      ...(arg.VKN
        ? {
            VKN: arg.VKN,
          }
        : null),
    };
  }
  toModel(arg: OrganizationRepositoryDTO): OrganizationEvent {
    const [_, ID] = arg.AccountID.split("#");
    const eventType =
      AccountEventType[arg.EventType as keyof typeof AccountEventType];
    const ts = trMoment(arg.TS);
    const payload = JSON.parse(arg.Payload);
    if (eventType === AccountEventType.OrganizationCreatedV1) {
      return {
        VKN: arg.VKN!,
        EventType: eventType,
        OrgID: ID,
        TS: ts,
        Payload: payload,
      };
    } else if (
      eventType === AccountEventType.UserJoinedV1 ||
      eventType === AccountEventType.OrganizationActivationToggledV1 ||
      eventType === AccountEventType.OrganizationActivationToggledV2 ||
      eventType === AccountEventType.OrganizationUpdatedV1 ||
      eventType === AccountEventType.OrganizationUpdateDeliveryAddressesV1 ||
      eventType === AccountEventType.OrganizationWithdrewFromBalanceV1 ||
      eventType === AccountEventType.OrganizationDepositedToBalanceV1 ||
      eventType === AccountEventType.OrganizationPaidWithCardV1
    ) {
      return {
        OrgID: ID,
        TS: ts,
        EventType: eventType,
        Payload: payload,
      };
    } else {
      throw createHttpError.InternalServerError("Unsupported event type");
    }
  }
}
