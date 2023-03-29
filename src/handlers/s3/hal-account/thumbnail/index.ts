import "reflect-metadata";
import "source-map-support/register";
import moment from "moment";
import { S3Event, Context } from "aws-lambda";
import { diContainer } from "../../../../core/di-registry";
import { S3Service } from "../../../../services/s3.service";
import { UserService } from "../../../../services/user.service";
import { AvatarSizeType } from "@halapp/common";
const sharp = require("sharp");

exports.handler = async function (event: S3Event, context: Context) {
  const s3Service = diContainer.resolve(S3Service);
  const userService = diContainer.resolve(UserService);
  console.log("Received S3 event:", JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    if (record.eventName === "ObjectRemoved:Delete") {
      return;
    }
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;
    const arr = [...key.split("/")];
    const userId = arr[arr.length - 1];
    console.log(`userId: ${userId}`);
    console.log(`Bucket: ${bucket}`, `Key: ${key}`);
    // Get Object
    const baseFolder = `images/${userId}/${moment().unix()}`;
    try {
      console.log("Getting image");
      // Getting image
      const image = await s3Service.getObject({ key });
      console.log("Tranforming image");
      const promiseArray = [
        s3Service.uploadObject({
          key: `${baseFolder}/${AvatarSizeType.large}.png`,
          body: await sharp(image)
            .resize(AvatarSizeType.large, AvatarSizeType.large)
            .toFormat("png")
            .toBuffer(),
        }),
        s3Service.uploadObject({
          key: `${baseFolder}/${AvatarSizeType.medium}.png`,
          body: await sharp(image)
            .resize(AvatarSizeType.medium, AvatarSizeType.medium)
            .toFormat("png")
            .toBuffer(),
        }),
        s3Service.uploadObject({
          key: `${baseFolder}/${AvatarSizeType.small}.png`,
          body: await sharp(image)
            .resize(AvatarSizeType.small, AvatarSizeType.small)
            .toFormat("png")
            .toBuffer(),
        }),
      ];
      // After bundle
      await Promise.all(promiseArray);
      console.log("deleting image");
      // Delete Object
      await s3Service.deleteObject({ key });
      await userService.update({
        ID: userId,
        BaseImageUrl: `${s3Service.getBaseUrl()}/${baseFolder}`,
      });
    } catch (err) {
      console.log(err);
      return err;
    }
  }
};
