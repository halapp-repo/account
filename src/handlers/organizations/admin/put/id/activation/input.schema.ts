import { object, string, number, InferType, array, boolean } from "yup";

const inputSchema = {
  body: object({
    Activation: boolean().required(),
    Balance: number().required(),
  }).required(),
};

type OrganizationActivationDTO = InferType<typeof inputSchema.body>;

export { inputSchema };
export type { OrganizationActivationDTO };
