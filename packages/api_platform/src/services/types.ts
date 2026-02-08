import { type AmazonBedrockProviderSettings } from "@ai-sdk/amazon-bedrock";
import { type OpenAIProviderSettings } from "@ai-sdk/openai";
import { type AnthropicProviderSettings } from "@ai-sdk/anthropic";
export enum Providers {
  AmazonBedrock = "amazon-bedrock",
  OpenAI = "openai",
  Anthropic = "anthropic",
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
  [Providers.Anthropic]: Omit<AnthropicProviderSettings, "apiKey"> &
    Required<Pick<OpenAIProviderSettings, "apiKey">>;
};

export type ProviderCredentials<T extends Providers> = ProviderCredentialsMap[T];
