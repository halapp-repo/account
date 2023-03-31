import { object, string, InferType } from "yup";
import "yup-phone";

const inputSchema = {
  body: object({
    FirstName: string().required(),
    LastName: string().required(),
    PhoneNumber: string().phone().required(),
  }).required(),
};

type UpdateUserDTO = InferType<typeof inputSchema.body>;

export { inputSchema };
export type { UpdateUserDTO };
