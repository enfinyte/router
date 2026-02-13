import { Context, Effect, Layer } from "effect";
import pg from "pg";

import { AppConfig } from "../config";

export class DatabasePool extends Context.Tag("DatabasePool")<DatabasePool, pg.Pool>() {}

export const DatabasePoolLive = Layer.scoped(
  DatabasePool,
  Effect.gen(function* () {
    const { postgresConnectionString } = yield* AppConfig;

    const pool = yield* Effect.acquireRelease(
      Effect.sync(() => new pg.Pool({ connectionString: postgresConnectionString })),
      (pool) =>
        Effect.tryPromise(() => pool.end()).pipe(
          Effect.tap(() => Effect.log("Database pool closed")),
          Effect.catchAll(() => Effect.void),
        ),
    );

    yield* Effect.log("Database pool created");
    return pool;
  }),
);
