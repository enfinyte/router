import { Effect } from "effect";
import pg from "pg";
import { DATABASE_NAME } from ".";
import { TABLE_DEFINITIONS, type ApiPlatformDatabase } from "./tables";
import type { Kysely } from "kysely";

export const replaceDatabaseInConnectionString = (
  connectionString: string,
  dbName: string,
): string => {
  const url = new URL(connectionString);
  url.pathname = `/${dbName}`;
  return url.toString();
};

export const ensureDatabaseExists = (connectionString: string) =>
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
