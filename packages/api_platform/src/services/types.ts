import { type AmazonBedrockProviderSettings } from "@ai-sdk/amazon-bedrock";
import { createOpenAI, type OpenAIProviderSettings } from "@ai-sdk/openai";
export enum Providers {
  AmazonBedrock = "amazon-bedrock",
  OpenAI = "openai",
}

export const SUPPORTED_PROVIDERS = Object.values(Providers);

type ProviderCredentialsMap = {
  [Providers.AmazonBedrock]: Omit<
    AmazonBedrockProviderSettings,
    "region" | "accessKeyId" | "secretAccessKey"
  > &
    Required<Pick<AmazonBedrockProviderSettings, "region" | "secretAccessKey" | "accessKeyId">>;
  [Providers.OpenAI]: Omit<OpenAIProviderSettings, "apiKey"> &
    Required<Pick<OpenAIProviderSettings, "apiKey">>;
};

export type ProviderCredentials<T extends Providers> = ProviderCredentialsMap[T];
