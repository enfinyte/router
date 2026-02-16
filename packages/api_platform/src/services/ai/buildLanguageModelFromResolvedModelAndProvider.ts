import { Effect } from "effect";
import { Providers, SUPPORTED_PROVIDERS, type ProviderCredentials } from "common";
import { AIServiceError } from ".";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { ResolvedResponse } from "common";

const buildInvalidProviderModelError = (provider?: string) =>
  Effect.fail(
    new AIServiceError({
      cause: !provider ? `Empty provider resolved` : `Unsupported provider: ${provider}`,
      message: !provider ? `Empty provider resolved` : `Unsupported provider: ${provider}`,
    }),
  );

export const buildLanguageModelFromResolvedModelAndProvider = (
  resolved: ResolvedResponse,
  credentials: ProviderCredentials<Providers>,
) =>
  Effect.gen(function* () {
    const { provider, model } = resolved;

    if (!provider) return yield* buildInvalidProviderModelError(provider);
    if (!model) return yield* buildInvalidProviderModelError(provider);

    if (!SUPPORTED_PROVIDERS.includes(provider as Providers))
      return yield* buildInvalidProviderModelError(provider);

    const languageModelProvider = yield* Effect.gen(function* () {
      switch (provider as Providers) {
        case Providers.AmazonBedrock: {
          return createAmazonBedrock(credentials as ProviderCredentials<Providers.AmazonBedrock>);
        }
        case Providers.OpenAI: {
          return createOpenAI(credentials as ProviderCredentials<Providers.OpenAI>);
        }
        case Providers.Anthropic: {
          return createAnthropic(credentials as ProviderCredentials<Providers.Anthropic>);
        }
        default:
          return yield* buildInvalidProviderModelError(provider);
      }
    });

    return languageModelProvider(model);
  });
