import { Effect, Context, Data, Layer } from "effect";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { AppConfig } from "../config";
import type { ApiPlatformDatabase } from "./tables";

export class DatabaseServiceError extends Data.TaggedError("DatabaseServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

interface DatabaseServiceImpl {
  use: <T>(
    fn: (client: Kysely<ApiPlatformDatabase>) => T,
  ) => Effect.Effect<Awaited<T>, DatabaseServiceError, never>;
}

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  DatabaseServiceImpl
>() {}

export const DatabaseServiceLive = Layer.scoped(
  DatabaseService,
  Effect.gen(function* () {
    const config = yield* AppConfig;

    const pool = new pg.Pool({ connectionString: config.pgConnection });

    const dbConn = yield* Effect.acquireRelease(
      Effect.try({
        try: () =>
          new Kysely<ApiPlatformDatabase>({
            dialect: new PostgresDialect({ pool }),
          }),
        catch: (err) => Effect.die("Failed to create database connection pool: " + String(err)),
      }),
      (db) =>
        Effect.promise(() => db.destroy()).pipe(
          Effect.tap(() => Effect.log("Database connection pool destroyed")),
          Effect.catchAll(() => Effect.void),
        ),
    );

    yield* Effect.logDebug("Database connection pool initialized");

    return DatabaseService.of({
      use: (fn) =>
        Effect.gen(function* () {
          const result = yield* Effect.try({
            try: () => fn(dbConn),
            catch: (e) =>
              new DatabaseServiceError({
                cause: e,
                message: "Syncronous error in `Discord.use`",
              }),
          });
          if (result instanceof Promise) {
            return yield* Effect.tryPromise({
              try: () => result,
              catch: (e) =>
                new DatabaseServiceError({
                  cause: e,
                  message: "Asyncronous error in `Discord.use`",
                }),
            });
          } else {
            return result;
          }
        }),
    });
  }),
);
