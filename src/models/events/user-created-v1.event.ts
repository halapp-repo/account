import { AccountEventType } from "@halapp/common";

interface UserCreatedV1Payload {
  UserID: string;
  OrganizationID: string;
  Email: string;
  Active: boolean;
}

type UserCreatedV1Event = {
  Email: string;
  UserID: string;
  TS: moment.Moment;
  EventType: AccountEventType.UserCreatedV1;
  Payload: UserCreatedV1Payload;
};

export type { UserCreatedV1Event, UserCreatedV1Payload };
