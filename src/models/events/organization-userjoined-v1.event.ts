import { AccountEventType } from "../account-event-type.enum";

interface UserJoinedV1Payload {
  UserID: string;
}

type UserJoinedV1Event = {
  VKN?: string;
  OrgID: string;
  TS: moment.Moment;
  EventType: AccountEventType.UserJoinedV1;
  Payload: UserJoinedV1Payload;
};

export type { UserJoinedV1Event, UserJoinedV1Payload };
