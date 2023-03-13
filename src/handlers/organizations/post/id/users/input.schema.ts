import { object, string, number, InferType, array } from "yup";

const inputSchema = {
  body: object({
    Email: string().email().required(),
  }).required(),
};

type CreateOrganizationUserDTO = InferType<typeof inputSchema.body>;

export { inputSchema };
export type { CreateOrganizationUserDTO };
