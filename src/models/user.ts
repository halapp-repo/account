import { trMoment } from "../utils/timezone";
import { AccountEventType } from "./account-event-type.enum";
import EventSourceAggregate from "./event-source-aggregate";
import { UserEvent } from "./events";
import { UserCreatedV1Event } from "./events/user-created-v1.event";

class User extends EventSourceAggregate {
  ID: string;
  Email: string;
  Active: boolean;

  apply(event: UserEvent): void {
    if (event.EventType === AccountEventType.UserCreatedV1) {
      this.whenUserCreatedV1(event);
    }
  }
  causes(event: UserEvent): void {
    this.Changes.push(event);
    this.apply(event);
  }
  whenUserCreatedV1(event: UserCreatedV1Event) {
    const { UserID, Active, Email } = event.Payload;
    this.ID = UserID;
    this.Active = Active;
    this.Email = Email;
  }
  createUser({ id, email }: { id: string; email: string }) {
    const event = <UserCreatedV1Event>{
      UserID: id,
      EventType: AccountEventType.UserCreatedV1,
      TS: trMoment(),
      Payload: {
        Active: true,
        Email: email,
        UserID: id,
      },
    };
    this.causes(event);
  }
}

export { User };
