import { trMoment } from "../utils/timezone";
import { AccountEventType } from "./account-event-type.enum";
import EventSourceAggregate from "./event-source-aggregate";
import { UserEvent } from "./events";
import { UserCreatedV1Event } from "./events/user-created-v1.event";

class User extends EventSourceAggregate {
  ID: string;
  Email: string;
  Active: boolean;
  JoinedOrganizations: string[];

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
    const { UserID, Active, Email, OrganizationID } = event.Payload;
    this.ID = UserID;
    this.Active = Active;
    this.Email = Email;
    this.JoinedOrganizations = [OrganizationID];
  }
  static create({
    id,
    email,
    organizationId,
  }: {
    id: string;
    email: string;
    organizationId: string;
  }): User {
    const event = <UserCreatedV1Event>{
      UserID: id,
      EventType: AccountEventType.UserCreatedV1,
      TS: trMoment(),
      Email: email,
      Payload: {
        Active: true,
        Email: email,
        UserID: id,
        OrganizationID: organizationId,
      },
    };
    const user = new User();
    user.causes(event);
    return user;
  }
}

export { User };
