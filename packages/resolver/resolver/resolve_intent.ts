import { Effect, Schema } from "effect";
import { getModelsDevData, getOpenRouterData } from "../data_manager";
import type { UnknownException } from "effect/Cause";
import type { ParseError } from "effect/ParseResult";
import type { PlatformError } from "@effect/platform/Error";
import { RootSchema as OpenRouterRootSchema } from "../data_manager/schema/openrouter";
import { RootSchema as ModelsDevRootSchema } from "../data_manager/schema/models_dev";
import type { IntentPair, ResolvedResponse } from "../types";
import type { FileSystem } from "@effect/platform/FileSystem";

export const resolveIntentPair = (
  pair: IntentPair,
): Effect.Effect<
  ResolvedResponse,
  UnknownException | Error | ParseError | PlatformError,
  FileSystem
> =>
  Effect.gen(function* () {
    const openRouterRawData = yield* getOpenRouterData(pair);
    const openRouterData = yield* Effect.try(() => JSON.parse(openRouterRawData));
    const openRouterRoot = yield* Schema.decode(OpenRouterRootSchema)(openRouterData);
    const openRouterModels = openRouterRoot.data.models;

    const modelsDevRawData = yield* getModelsDevData;
    const modelsDevData = yield* Effect.try(() => JSON.parse(modelsDevRawData));
    const modelsDevRoot = yield* Schema.decode(ModelsDevRootSchema)(modelsDevData);
    console.log(modelsDevRoot);

    return {
      model: "",
      provider: "",
    };
  });
