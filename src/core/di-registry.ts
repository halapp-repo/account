import { container } from "tsyringe";
import { SESStore } from "../repositories/ses-store";

container.registerSingleton<SESStore>("SESStore", SESStore);

export const diContainer = container;
