import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { Providers, type ProviderCredentials } from "common";

interface ProviderEntry<T extends Providers> {
  createClient: (creds: ProviderCredentials<T>) => (model: string) => ReturnType<ReturnType<typeof createOpenAI>>;
  extractCredentials: (secrets: Record<string, string>) => ProviderCredentials<T>;
}

const registry: { [P in Providers]: ProviderEntry<P> } = {
  [Providers.AmazonBedrock]: {
    createClient: (creds) => createAmazonBedrock(creds),
    extractCredentials: (secrets) => ({
      accessKeyId: secrets["accessKeyId"] ?? "",
      secretAccessKey: secrets["secretAccessKey"] ?? "",
      region: secrets["region"] ?? "",
    }) as ProviderCredentials<Providers.AmazonBedrock>,
  },
  [Providers.OpenAI]: {
    createClient: (creds) => createOpenAI(creds),
    extractCredentials: (secrets) => ({
      apiKey: secrets["apiKey"] ?? "",
    }) as ProviderCredentials<Providers.OpenAI>,
  },
  [Providers.Anthropic]: {
    createClient: (creds) => createAnthropic(creds),
    extractCredentials: (secrets) => ({
      apiKey: secrets["apiKey"] ?? "",
    }) as ProviderCredentials<Providers.Anthropic>,
  },
};

export const getProviderEntry = <T extends Providers>(provider: T) =>
  registry[provider] as ProviderEntry<T>;
