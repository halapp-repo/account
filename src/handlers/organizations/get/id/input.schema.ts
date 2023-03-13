import { AccountEventType, OrderStatusType } from "@halapp/common";
import { object, string, InferType, mixed, boolean, array } from "yup";

const inputSchema = {
  queryStringParameters: object({
    includeEvents: boolean().optional(),
  }),
};

type ByEvent = InferType<typeof inputSchema.queryStringParameters>;

export { inputSchema };
export type { ByEvent };
