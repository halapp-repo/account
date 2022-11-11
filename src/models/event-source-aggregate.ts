import { OrganizationEvent, UserEvent } from "./events";

abstract class EventSourceAggregate {
  Changes: OrganizationEvent[] = [];
  abstract apply(event: OrganizationEvent | UserEvent): void;
}

export default EventSourceAggregate;
