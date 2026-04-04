import { Effect } from "effect";
import { ProviderModelParseError, ProviderModelPair } from "../types";

export const parseProviderModelImpl = (input: string) =>
  Effect.gen(function* () {
    const firstSlashIndex = input.indexOf("/");

    if (firstSlashIndex === -1) {
      return yield* new ProviderModelParseError({
        reason: "BadFormatting",
        message: `Expected format "provider/model", got: "${input}"`,
      });
    }

    const provider = input.substring(0, firstSlashIndex);
    const model = input.substring(firstSlashIndex + 1);

    if (!provider) {
      return yield* new ProviderModelParseError({
        reason: "EmptyProvider",
        message: `Provider must be non-empty, got: "${input}"`,
      });
    }

    if (!model) {
      return yield* new ProviderModelParseError({
        reason: "EmptyModel",
        message: `Model must be non-empty, got: "${input}"`,
      });
    }

    return new ProviderModelPair({ provider, model });
  });
