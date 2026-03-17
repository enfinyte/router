import { Context, Data, Effect, Layer } from "effect";
import { createClient } from "redis";
import { RedisConfig, RedisConfigLive } from "@enfinyte/config";

export class RedisError extends Data.TaggedError("RedisError")<{
  cause?: unknown;
  message?: string;
}> {}

interface RedisImpl {
  use: <T>(
    fn: (client: ReturnType<typeof createClient>) => T,
  ) => Effect.Effect<Awaited<T>, RedisError, never>;
}
export class Redis extends Context.Tag("Redis")<Redis, RedisImpl>() {}

export const make = (options?: Parameters<typeof createClient>[0]) =>
  Effect.gen(function* () {
    const client = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => createClient(options).connect(),
        catch: (e) => new RedisError({ cause: e, message: "Error connecting" }),
      }),
      (client) => Effect.promise(() => client.quit()),
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

export const layer = (options?: Parameters<typeof createClient>[0]) =>
  Layer.scoped(Redis, make(options));

export const fromEnv = Layer.scoped(
  Redis,
  Effect.gen(function* () {
    const { url } = yield* RedisConfig;
    return yield* make({ url });
  }),
).pipe(Layer.provide(RedisConfigLive));
