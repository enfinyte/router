import { Context, Effect, Layer } from "effect";
import { runDataFetch } from "./data_manager";
import { resolveImpl } from "./resolver";
import type { CreateResponseBody } from "common";
import type {
  DataFetchError,
  IntentParseError,
  NoProviderAvailableError,
  ProviderModelParseError,
  ResolveError,
} from "./types";
import * as Redis from "./redis/index";
import type { ParseError } from "effect/ParseResult";

export { ResolverLoggerLive } from "./logger";

export * from "./types";

export class ResolverService extends Context.Tag("ResolverService")<
  ResolverService,
  {
    getAvailableModels: () => Effect.Effect<
      Record<string, readonly string[]>,
      ParseError | Redis.RedisError
    >;
    resolve: (
      options: CreateResponseBody,
      userProviders: string[],
      analysisTarget: string | undefined,
    ) => Effect.Effect<
      {
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
      resolve(options, userProviders, analysisTarget) {
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
          const pairs = yield* resolveImpl(options, userProviders, analysisTarget);

          yield* Effect.logInfo("Resolve completed").pipe(
            Effect.annotateLogs({
              service: "Resolver",
              operation: "resolve",
              pairs: pairs,
            }),
          );

          return pairs;
        }).pipe(Effect.provideService(Redis.Redis, redis));
      },
      getAvailableModels: () =>
        Redis.getAllModelsGroupedByProvider().pipe(Effect.provideService(Redis.Redis, redis)),
    });
  }),
).pipe(Layer.provide(Redis.fromEnv));
