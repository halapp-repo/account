import { object, string, InferType } from "yup";

const inputSchema = {
  queryStringParameters: object({
    fileType: string().required(),
    filePath: string().required(),
  }),
};

type ByEvent = InferType<typeof inputSchema.queryStringParameters>;

export { inputSchema };
export type { ByEvent };
