import { trMoment } from "../utils/timezone";
import { AccountEventType } from "@halapp/common";
import EventSourceAggregate from "./event-source-aggregate";
import { UserEvent } from "./events";
import { UserCreatedV1Event } from "./events/user-created-v1.event";
import { UserJoinedOrganizationV1Event } from "./events/user-joined-organization-v1.event";

class User extends EventSourceAggregate {
  ID: string;
  Email: string;
  Active: boolean;
  JoinedOrganizations: string[];

  apply(event: UserEvent): void {
    if (event.EventType === AccountEventType.UserCreatedV1) {
      this.whenUserCreatedV1(event);
    } else if (event.EventType === AccountEventType.UserJoinedV1) {
      this.whenUserJoinedOrganizationV1(event);
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
  whenUserJoinedOrganizationV1(event: UserJoinedOrganizationV1Event) {
    const { OrganizationID } = event.Payload;
    this.JoinedOrganizations = [
      ...new Set([...this.JoinedOrganizations, OrganizationID]),
    ];
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
  joinOrganization(organizationId: string) {
    if (this.JoinedOrganizations?.includes(organizationId)) {
      return;
    }
    const event = <UserJoinedOrganizationV1Event>{
      UserID: this.ID,
      EventType: AccountEventType.UserJoinedV1,
      TS: trMoment(),
      Payload: {
        OrganizationID: organizationId,
      },
    };
    this.causes(event);
  }
}

export { User };
