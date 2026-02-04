import { type ProviderCredentials, Providers } from "./types";

export function getCredentials(
  provider: Providers.AmazonBedrock,
): ProviderCredentials<Providers.AmazonBedrock>;
export function getCredentials(provider: Providers.OpenAI): ProviderCredentials<Providers.OpenAI>;
export function getCredentials(provider: Providers): ProviderCredentials<Providers> {
  switch (provider) {
    case Providers.AmazonBedrock:
      return {
        accessKeyId: "",
        secretAccessKey: "",
        region: "",
      } satisfies ProviderCredentials<Providers.AmazonBedrock>;
    case Providers.OpenAI:
      return { apiKey: "" } satisfies ProviderCredentials<Providers.OpenAI>;
    default: {
      const _exhaustiveCheck: never = provider satisfies never;
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
