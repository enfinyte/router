import { Context, Effect, Layer } from "effect";
import { Pool } from "pg";

import { appConfig } from "./config";

export class DatabasePool extends Context.Tag("DatabasePool")<DatabasePool, Pool>() {}

export const DatabasePoolLive = Layer.effect(
  DatabasePool,
  Effect.gen(function* () {
    const { postgresConnectionString } = yield* appConfig;
    const pool = new Pool({ connectionString: postgresConnectionString });

    // Graceful shutdown -- close connections when the process exits
    // process.on("SIGTERM", () => pool.end());
    // process.on("SIGINT", () => pool.end());

    yield* Effect.log("Database pool created");
    return pool;
  }),
);
