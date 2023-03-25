import { AccountEventType } from "@halapp/common";

interface UserUpdatedV1Payload {
  FirstName?: string;
  LastName?: string;
  PhoneNumber?: string;
  BaseImageUrl?: string;
}

type UserUpdatedV1Event = {
  Email?: string;
  UserID: string;
  TS: moment.Moment;
  EventType: AccountEventType.UserUpdatedV1;
  Payload: UserUpdatedV1Payload;
};

export type { UserUpdatedV1Event, UserUpdatedV1Payload };
