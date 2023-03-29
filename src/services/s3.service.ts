import { inject, injectable } from "tsyringe";
import { Upload } from "@aws-sdk/lib-storage";
import {
  createPresignedPost,
  PresignedPostOptions,
  PresignedPost,
} from "@aws-sdk/s3-presigned-post";
import createHttpError = require("http-errors");
import { S3Store } from "../repositories/s3-store";
import {
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

@injectable()
export class S3Service {
  bucketName: string;
  region: string;
  constructor(
    @inject("S3Store")
    private s3Store: S3Store
  ) {
    const { S3BucketName, Region } = process.env;
    if (!S3BucketName) {
      throw new createHttpError.InternalServerError(
        "S3BucketName must come from env"
      );
    }
    if (!Region) {
      throw new createHttpError.InternalServerError(
        "Region must come from env"
      );
    }
    this.bucketName = S3BucketName;
    this.region = Region;
  }
  async generatePresignPost({
    filePath,
    fileType,
  }: {
    filePath: string;
    fileType: string;
  }): Promise<PresignedPost> {
    const params = {
      Bucket: this.bucketName,
      Region: this.region,
      Key: filePath,
      Fields: { acl: "public-read" },
      Conditions: [
        // content length restrictions: 0-2MB]
        ["content-length-range", 0, 2000000],
        // specify content-type to be more generic- images only
        // ['starts-with', '$Content-Type', 'image/'],
        ["eq", "$Content-Type", fileType],
      ],
      // number of seconds for which the presigned policy should be valid
      Expires: 15,
    } as PresignedPostOptions;
    return createPresignedPost(this.s3Store.s3Client, params);
  }
  async getObject({ key }: { key: string }): Promise<Uint8Array> {
    const { Body } = await this.s3Store.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
    if (!Body) {
      throw new Error("Body does not exists");
    }
    return Body.transformToByteArray();
  }
  async deleteObject({ key }: { key: string }): Promise<void> {
    await this.s3Store.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
    return;
  }
  async uploadObject({
    key,
    body,
  }: {
    key: string;
    body: Uint8Array;
  }): Promise<void> {
    const parallelUploads3 = new Upload({
      client: this.s3Store.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: body,
      },
    });
    await parallelUploads3.done();
    return;
  }
  getBaseUrl(): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;
  }
}
