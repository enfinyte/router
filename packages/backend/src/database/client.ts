import { Context, Data, Effect, Layer } from "effect";
import { Kysely, PostgresDialect } from "kysely";

import type { BackendDatabase } from "./tables";
import { DatabasePool, DatabasePoolLive } from "./pool";

export class DatabaseServiceError extends Data.TaggedError("DatabaseServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

interface DatabaseServiceImpl {
  use: <T>(
    fn: (db: Kysely<BackendDatabase>) => T,
  ) => Effect.Effect<Awaited<T>, DatabaseServiceError, never>;
}

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  DatabaseServiceImpl
>() {}

export const DatabaseServiceLive = Layer.scoped(
  DatabaseService,
  Effect.gen(function* () {
    const pool = yield* DatabasePool;

    const db = yield* Effect.acquireRelease(
      Effect.try(
        () =>
          new Kysely<BackendDatabase>({
            dialect: new PostgresDialect({ pool }),
          }),
      ).pipe(Effect.orDie),
      (db) =>
        Effect.tryPromise(() => db.destroy()).pipe(
          Effect.tap(() => Effect.log("Kysely connection destroyed")),
          Effect.catchAll(() => Effect.void),
        ),
    );

    yield* Effect.log("Kysely connection initialized");

    return DatabaseService.of({
      use: (fn) =>
        Effect.gen(function* () {
          const result = yield* Effect.try({
            try: () => fn(db),
            catch: (e) =>
              new DatabaseServiceError({
                cause: e,
                message: "Synchronous error in DatabaseService.use",
              }),
          });
          if (result instanceof Promise) {
            return yield* Effect.tryPromise({
              try: () => result,
              catch: (e) =>
                new DatabaseServiceError({
                  cause: e,
                  message: "Asynchronous error in DatabaseService.use",
                }),
            });
          }
          return result;
        }),
    });
  }),
).pipe(Layer.provide(DatabasePoolLive));
