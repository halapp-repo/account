import { OrganizationActivationToggledV1Event } from "./organization-activation-toggled-v1.event";
import { OrganizationCreatedV1Event } from "./organization-created-v1.event";
import { OrganizationUpdatedV1Event } from "./organization-updated-v1.event";
import { UserJoinedV1Event } from "./organization-userjoined-v1.event";
import { UserCreatedV1Event } from "./user-created-v1.event";

export type OrganizationEvent =
  | OrganizationCreatedV1Event
  | UserJoinedV1Event
  | OrganizationActivationToggledV1Event
  | OrganizationUpdatedV1Event;
export type UserEvent = UserCreatedV1Event;
