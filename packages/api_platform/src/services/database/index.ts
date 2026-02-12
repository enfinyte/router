import { Effect, Context, Data, Layer } from "effect";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { AppConfig } from "../config";
import { type ApiPlatformDatabase } from "./tables";
import {
  ensureDatabaseExists,
  ensureTablesExist,
  replaceDatabaseInConnectionString,
} from "./utils";
export * from "./responses";

export const DATABASE_NAME = "api_platform_db";

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

    yield* ensureDatabaseExists(config.pgConnection);

    const targetConnStr = replaceDatabaseInConnectionString(config.pgConnection, DATABASE_NAME);
    const pool = new pg.Pool({ connectionString: targetConnStr });

    const dbConn = yield* Effect.acquireRelease(
      Effect.try(
        () =>
          new Kysely<ApiPlatformDatabase>({
            dialect: new PostgresDialect({ pool }),
          }),
      ).pipe(Effect.orDie),
      (db) =>
        Effect.promise(() => db.destroy()).pipe(
          Effect.tap(() => Effect.log("Database connection pool destroyed")),
          Effect.catchAll(() => Effect.void),
        ),
    );

    yield* Effect.log("Database connection pool initialized");
    yield* ensureTablesExist(dbConn).pipe(Effect.orDie);

    return DatabaseService.of({
      use: (fn) =>
        Effect.gen(function* () {
          const result = yield* Effect.try({
            try: () => fn(dbConn),
            catch: (e) =>
              new DatabaseServiceError({
                cause: e,
                message: "Synchronous error in `DatabaseService.use`",
              }),
          });
          if (result instanceof Promise) {
            return yield* Effect.tryPromise({
              try: () => result,
              catch: (e) =>
                new DatabaseServiceError({
                  cause: e,
                  message: "Asynchronous error in `DatabaseService.use`",
                }),
            });
          }
          return result;
        }),
    });
  }),
);
