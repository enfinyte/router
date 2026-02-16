import { Effect } from "effect";
import { ProviderModelParseError, ProviderModelPair } from "../types";

export const parseProviderModelImpl = (input: string) =>
  Effect.gen(function* () {
    const firstSlashIndex = input.indexOf("/");

    if (firstSlashIndex === -1) {
      yield* Effect.logWarning("Provider/model parse failed: missing separator").pipe(
        Effect.annotateLogs({ service: "Parser", operation: "parseProviderModel", input, reason: "BadFormatting" }),
      );
      return yield* new ProviderModelParseError({
        reason: "BadFormatting",
        message: `Expected format "provider/model", got: "${input}"`,
      });
    }

    const provider = input.substring(0, firstSlashIndex);
    const model = input.substring(firstSlashIndex + 1);

    if (!provider) {
      yield* Effect.logWarning("Provider/model parse failed: empty provider").pipe(
        Effect.annotateLogs({ service: "Parser", operation: "parseProviderModel", input, reason: "EmptyProvider" }),
      );
      return yield* new ProviderModelParseError({
        reason: "EmptyProvider",
        message: `Provider must be non-empty, got: "${input}"`,
      });
    }

    if (!model) {
      yield* Effect.logWarning("Provider/model parse failed: empty model").pipe(
        Effect.annotateLogs({ service: "Parser", operation: "parseProviderModel", input, reason: "EmptyModel" }),
      );
      return yield* new ProviderModelParseError({
        reason: "EmptyModel",
        message: `Model must be non-empty, got: "${input}"`,
      });
    }

    yield* Effect.logDebug("Provider/model parsed").pipe(
      Effect.annotateLogs({ service: "Parser", operation: "parseProviderModel", provider, model }),
    );

    return new ProviderModelPair({ provider, model });
  });
