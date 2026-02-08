import { Effect } from "effect";
import { Providers, SUPPORTED_PROVIDERS } from "../types";
import { AIServiceError } from ".";
import * as CredentialsService from "../credentials";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createOpenAI } from "@ai-sdk/openai";
import type { ResolvedModelAndProvider } from "../pmr";

const buildInvalidProviderModelError = (provider?: string) =>
  Effect.fail(
    new AIServiceError({
      cause: !provider ? `Empty provider resolved` : `Unsupported provider: ${provider}`,
      message: !provider ? `Empty provider resolved` : `Unsupported provider: ${provider}`,
    }),
  );

export const buildLanguageModelFromResolvedModelAndProvider = (
  providerModel: ResolvedModelAndProvider,
) =>
  Effect.gen(function* () {
    const [provider, ...modelParts] = providerModel.split("/");

    if (!provider || !modelParts.length) return yield* buildInvalidProviderModelError(provider);

    const model = modelParts.join(":");

    if (!provider || !SUPPORTED_PROVIDERS.includes(provider as Providers))
      return yield* buildInvalidProviderModelError(provider);

    const languageModelProvider = yield* Effect.gen(function* () {
      switch (provider as Providers) {
        case Providers.AmazonBedrock: {
          const credentials = CredentialsService.getCredentials(Providers.AmazonBedrock);
          return createAmazonBedrock(credentials);
        }
        case Providers.OpenAI: {
          const credentials = CredentialsService.getCredentials(Providers.OpenAI);
          return createOpenAI(credentials);
        }
        default:
          return yield* buildInvalidProviderModelError(provider);
      }
    });

    return languageModelProvider(model);
  });
