import { OrganizationActivationChangedV1Event } from "./organization-activation-changed-v1.event";
import { OrganizationCreatedV1Event } from "./organization-created-v1.event";
import { UserJoinedV1Event } from "./organization-userjoined-v1.event";
import { UserCreatedV1Event } from "./user-created-v1.event";

export type OrganizationEvent =
  | OrganizationCreatedV1Event
  | UserJoinedV1Event
  | OrganizationActivationChangedV1Event;
export type UserEvent = UserCreatedV1Event;
