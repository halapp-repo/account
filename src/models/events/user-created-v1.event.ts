import { AccountEventType } from "../account-event-type.enum";

type UserCreatedV1Event = {
  UserID: string;
  TS: moment.Moment;
  EventType: AccountEventType.OrganizationCreatedV1;
  Payload: null;
};

export type { UserCreatedV1Event };
