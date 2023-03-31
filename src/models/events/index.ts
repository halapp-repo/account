import { OrganizationActivationToggledV1Event } from "./organization-activation-toggled-v1.event";
import { OrganizationCreatedV1Event } from "./organization-created-v1.event";
import { OrganizationUpdatedV1Event } from "./organization-updated-v1.event";
import { UserJoinedV1Event } from "./organization-userjoined-v1.event";
import { UserCreatedV1Event } from "./user-created-v1.event";
import { OrganizationUpdateDeliveryAddressesV1Event } from "./organization-update-delivery-addresses-v1.event";
import { UserJoinedOrganizationV1Event } from "./user-joined-organization-v1.event";
import { OrganizationActivationToggledV2Event } from "./organization-activation-toggled-v2.event";
import { OrganizationWithdrewFromBalanceV1Event } from "./organization-withdrew-v1.event";
import { OrganizationDepositedToBalanceV1Event } from "./organization-deposited-to-balance-v1.event";
import { UserUpdatedV1Event } from "./user-updated-v1.event";
import { OrganizationPaidWithCardV1Event } from "./organization-paid-with-card-v1.event";

export type OrganizationEvent =
  | OrganizationCreatedV1Event
  | UserJoinedV1Event
  | OrganizationActivationToggledV1Event
  | OrganizationUpdatedV1Event
  | OrganizationUpdateDeliveryAddressesV1Event
  | OrganizationActivationToggledV2Event
  | OrganizationWithdrewFromBalanceV1Event
  | OrganizationDepositedToBalanceV1Event
  | OrganizationPaidWithCardV1Event;

export type UserEvent =
  | UserCreatedV1Event
  | UserJoinedOrganizationV1Event
  | UserUpdatedV1Event;
