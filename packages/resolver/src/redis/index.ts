import { Context, Data, Effect, Layer } from "effect";
import { RedisClient } from "bun";
import { RedisConfig, RedisConfigLive } from "@enfinyte/config";

export class RedisError extends Data.TaggedError("RedisError")<{
  cause?: unknown;
  message?: string;
}> {}

interface RedisImpl {
  use: <T>(fn: (client: RedisClient) => T) => Effect.Effect<Awaited<T>, RedisError, never>;
}
export class Redis extends Context.Tag("Redis")<Redis, RedisImpl>() {}

export const make = (...options: ConstructorParameters<typeof RedisClient>) =>
  Effect.gen(function* () {
    const client = yield* Effect.acquireRelease(
      Effect.try({
        try: () => new RedisClient(...options),
        catch: (e) => new RedisError({ cause: e, message: "Error connecting" }),
      }),
      (client) => Effect.sync(() => client.close()),
    );
    return Redis.of({
      use: (fn) =>
        Effect.gen(function* () {
          const result = yield* Effect.try({
            try: () => fn(client),
            catch: (e) =>
              new RedisError({
                cause: e,
                message: "Synchronous error in `Redis.use`",
              }),
          });
          if (result instanceof Promise) {
            return yield* Effect.tryPromise({
              try: () => result,
              catch: (e) =>
                new RedisError({
                  cause: e,
                  message: "Asynchronous error in `Redis.use`",
                }),
            });
          } else {
            return result;
          }
        }),
    });
  });

export const layer = (...options: ConstructorParameters<typeof RedisClient>) =>
  Layer.scoped(Redis, make(...options));

export const fromEnv = Layer.scoped(
  Redis,
  Effect.gen(function* () {
    const { url } = yield* RedisConfig;
    return yield* make(url, { autoReconnect: true, enableAutoPipelining: true });
  }),
).pipe(Layer.provide(RedisConfigLive));

export * from "./fetch_point";
export * from "./model_to_providers";
export * from "./categories";
export * from "./provider_to_models";
