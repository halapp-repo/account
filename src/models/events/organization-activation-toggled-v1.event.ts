import { AccountEventType } from "@halapp/common";

interface OrganizationActivationToggledV1Payload {
  Activate: boolean;
}

type OrganizationActivationToggledV1Event = {
  VKN?: string;
  OrgID: string;
  TS: moment.Moment;
  EventType: AccountEventType.OrganizationActivationToggledV1;
  Payload: OrganizationActivationToggledV1Payload;
};

export type {
  OrganizationActivationToggledV1Event,
  OrganizationActivationToggledV1Payload,
};
