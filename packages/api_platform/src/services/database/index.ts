import { Effect, Context, Data, Layer } from "effect";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { AppConfig } from "../config";
import { TABLE_DEFINITIONS, type ApiPlatformDatabase } from "./tables";

export * from "./responses";

const DATABASE_NAME = "api_platform_db";

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

const replaceDatabaseInConnectionString = (connectionString: string, dbName: string): string => {
  const url = new URL(connectionString);
  url.pathname = `/${dbName}`;
  return url.toString();
};

const ensureDatabaseExists = (connectionString: string) =>
  Effect.gen(function* () {
    const adminConnStr = replaceDatabaseInConnectionString(connectionString, "postgres");
    const client = new pg.Client({ connectionString: adminConnStr });

    yield* Effect.log("Connecting to postgres maintenance database");
    yield* Effect.tryPromise(() => client.connect()).pipe(Effect.orDie);

    yield* Effect.log(`Checking if database "${DATABASE_NAME}" exists`);
    const result = yield* Effect.tryPromise(() =>
      client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DATABASE_NAME]),
    ).pipe(Effect.orDie);

    if (result.rows.length === 0) {
      yield* Effect.log(`Database "${DATABASE_NAME}" not found, creating`);
      yield* Effect.tryPromise(() => client.query(`CREATE DATABASE "${DATABASE_NAME}"`)).pipe(
        Effect.orDie,
      );
      yield* Effect.log(`Database "${DATABASE_NAME}" created`);
    } else {
      yield* Effect.log(`Database "${DATABASE_NAME}" already exists`);
    }

    yield* Effect.promise(() => client.end()).pipe(Effect.catchAll(() => Effect.void));
  });

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

export const ensureTablesExist = (db: Kysely<ApiPlatformDatabase>) =>
  Effect.all(
    Object.entries(TABLE_DEFINITIONS).map(([tableName, tableDef]) =>
      Effect.gen(function* () {
        yield* Effect.log(`Ensuring table "${tableName}" exists`);
        yield* Effect.tryPromise(() => tableDef.create(db));
        yield* Effect.log(`Table "${tableName}" ready`);
      }),
    ),
    { concurrency: 5 },
  );
