import { object, string, InferType, mixed } from "yup";
import "yup-phone";

const imageMimeType = /image\/(png|jpg|jpeg)/i;

const inputSchema = {
  body: object({
    File: mixed()
      .test("fileSize", "The file is too large", (value) => {
        return value.size <= 2097152;
      })
      .test("fileType", "The file is not  supported", (value) => {
        return value.type.match(imageMimeType);
      }),
  }).required(),
};

type PostUserAvatarDTO = InferType<typeof inputSchema.body>;

export { inputSchema };
export type { PostUserAvatarDTO };
