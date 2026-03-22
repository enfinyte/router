import type { CreateResponseBody } from "common";
import type { ParseError } from "effect/ParseResult";

import { Context, Effect, Layer } from "effect";

import type {
  DataFetchError,
  IntentParseError,
  NoProviderAvailableError,
  ProviderModelParseError,
  ResolveError,
} from "./types";

import { runDataFetch } from "./data_manager";
import * as Redis from "./redis/index";
import { resolveImpl } from "./resolver";

export { ResolverLoggerLive } from "./logger";

export * from "./types";

export class ResolverService extends Context.Tag("ResolverService")<
  ResolverService,
  {
    getAvailableModels: () => Effect.Effect<
      Record<string, readonly string[]>,
      ParseError | Redis.RedisError | DataFetchError
    >;
    resolve: (
      options: CreateResponseBody,
      userdId: string,
      userProviders: string[],
      analysisTarget: string,
    ) => Effect.Effect<
      readonly {
        readonly model: string;
        readonly provider: string;
      }[],
      | Redis.RedisError
      | ParseError
      | DataFetchError
      | ResolveError
      | IntentParseError
      | NoProviderAvailableError
      | ProviderModelParseError
    >;
  }
>() {}

export const ResolverServiceLive = Layer.effect(
  ResolverService,
  Effect.gen(function* () {
    const redis = yield* Redis.Redis;
    return ResolverService.of({
      resolve(options, userdId, userProviders, analysisTarget) {
        return Effect.gen(function* () {
          yield* Effect.logInfo("Resolve request received").pipe(
            Effect.annotateLogs({
              service: "Resolver",
              operation: "resolve",
              model: typeof options.model === "string" ? options.model : typeof options.model,
              providerCount: userProviders.length,
              analysisTarget: analysisTarget ?? "per_prompt",
            }),
          );

          yield* runDataFetch();
          const pairs = yield* resolveImpl(options, userdId, userProviders, analysisTarget);

          yield* Effect.logInfo("Resolve completed").pipe(
            Effect.annotateLogs({
              service: "Resolver",
              operation: "resolve",
              pairs_length: pairs.length,
            }),
          );

          return pairs;
        }).pipe(Effect.provideService(Redis.Redis, redis));
      },
      getAvailableModels() {
        return Effect.gen(function* () {
          yield* runDataFetch();
          return yield* Redis.getAllModelsGroupedByProvider();
        }).pipe(Effect.provideService(Redis.Redis, redis));
      },
    });
  }),
).pipe(Layer.provide(Redis.fromEnv));
