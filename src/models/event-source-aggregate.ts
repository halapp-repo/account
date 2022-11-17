import { OrganizationEvent, UserEvent } from "./events";

abstract class EventSourceAggregate {
  Changes: (OrganizationEvent | UserEvent)[] = [];
  abstract apply(event: OrganizationEvent | UserEvent): void;
}

export default EventSourceAggregate;
