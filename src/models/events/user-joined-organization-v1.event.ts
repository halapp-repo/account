import { AccountEventType } from "../account-event-type.enum";

interface UserJoinedOrganizationV1Payload {
  OrganizationID: string;
}

type UserJoinedOrganizationV1Event = {
  Email?: string;
  UserID: string;
  TS: moment.Moment;
  EventType: AccountEventType.UserJoinedV1;
  Payload: UserJoinedOrganizationV1Payload;
};

export type { UserJoinedOrganizationV1Event, UserJoinedOrganizationV1Payload };
