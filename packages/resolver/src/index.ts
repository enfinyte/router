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
        readonly category: string | null;
      }[],
      | Redis.RedisError
      | ParseError
      | DataFetchError
      | ResolveError
      | IntentParseError
      | NoProviderAvailableError
      | ProviderModelParseError
    >;
    getCostForModel: (
      canonicalProviderModelName: string,
    ) => Effect.Effect<{ input: number; output: number } | null, ParseError | Redis.RedisError>;
  }
>() {}

export const ResolverServiceLive = Layer.effect(
  ResolverService,
  Effect.gen(function* () {
    const redis = yield* Redis.Redis;

    const withRedis = <A, E>(effect: Effect.Effect<A, E, Redis.Redis>) =>
      effect.pipe(Effect.provideService(Redis.Redis, redis));

    return ResolverService.of({
      resolve(options, userdId, userProviders, analysisTarget) {
        return withRedis(
          Effect.gen(function* () {
            yield* runDataFetch();
            return yield* resolveImpl(options, userdId, userProviders, analysisTarget);
          }),
        );
      },
      getAvailableModels() {
        return withRedis(
          Effect.gen(function* () {
            yield* runDataFetch();
            return yield* Redis.getAllModelsGroupedByProvider();
          }),
        );
      },
      getCostForModel(canonicalProviderModelName) {
        return withRedis(Redis.getCostForModel(canonicalProviderModelName));
      },
    });
  }),
).pipe(Layer.provide(Redis.fromEnv));
