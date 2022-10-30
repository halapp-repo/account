import { container } from "tsyringe";
import { S3Store } from "../repositories/s3-store";
import { SESStore } from "../repositories/ses-store";

container.registerSingleton<SESStore>("SESStore", SESStore);
container.registerSingleton<S3Store>("S3Store", S3Store);

export const diContainer = container;
