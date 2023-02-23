import { AccountEventType } from "@halapp/common";

interface OrganizationActivationToggledV2Payload {
  Activate: boolean;
  Balance: number;
}

type OrganizationActivationToggledV2Event = {
  VKN?: string;
  OrgID: string;
  TS: moment.Moment;
  EventType: AccountEventType.OrganizationActivationToggledV2;
  Payload: OrganizationActivationToggledV2Payload;
};

export type {
  OrganizationActivationToggledV2Event,
  OrganizationActivationToggledV2Payload,
};
