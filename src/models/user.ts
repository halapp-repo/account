import { trMoment } from "../utils/timezone";
import { AccountEventType, EventSourceAggregate } from "@halapp/common";
import { UserEvent } from "./events";
import { UserCreatedV1Event } from "./events/user-created-v1.event";
import { UserJoinedOrganizationV1Event } from "./events/user-joined-organization-v1.event";
import { UserUpdatedV1Event } from "./events/user-updated-v1.event";

class User extends EventSourceAggregate<UserEvent> {
  ID: string;
  Email: string;
  Active: boolean;
  JoinedOrganizations: string[];
  FirstName?: string;
  LastName?: string;
  PhoneNumber?: string;
  BaseImageUrl?: string;

  apply(event: UserEvent): void {
    this.RetroEvents.push(event);
    if (event.EventType === AccountEventType.UserCreatedV1) {
      this.whenUserCreatedV1(event);
    } else if (event.EventType === AccountEventType.UserJoinedV1) {
      this.whenUserJoinedOrganizationV1(event);
    } else if (event.EventType === AccountEventType.UserUpdatedV1) {
      this.whenUserUpdatedV1(event);
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
  whenUserUpdatedV1(event: UserUpdatedV1Event) {
    const { FirstName, LastName, BaseImageUrl, PhoneNumber } = event.Payload;
    FirstName && (this.FirstName = FirstName);
    LastName && (this.LastName = LastName);
    PhoneNumber && (this.PhoneNumber = PhoneNumber);
    BaseImageUrl && (this.BaseImageUrl = BaseImageUrl);
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
  update({
    FirstName,
    LastName,
    PhoneNumber,
    BaseImageUrl,
  }: {
    FirstName?: string;
    LastName?: string;
    PhoneNumber?: string;
    BaseImageUrl?: string;
  }): void {
    const event = <UserUpdatedV1Event>{
      EventType: AccountEventType.UserUpdatedV1,
      TS: trMoment(),
      UserID: this.ID,
      Payload: {
        ...(FirstName && this.FirstName !== FirstName
          ? {
              FirstName: FirstName,
            }
          : null),
        ...(LastName && this.LastName !== LastName
          ? {
              LastName: LastName,
            }
          : null),
        ...(PhoneNumber && this.PhoneNumber !== PhoneNumber
          ? {
              PhoneNumber: PhoneNumber,
            }
          : null),
        ...(BaseImageUrl && this.BaseImageUrl !== BaseImageUrl
          ? {
              BaseImageUrl: BaseImageUrl,
            }
          : null),
      },
    };
    this.causes(event);
  }
}

export { User };
