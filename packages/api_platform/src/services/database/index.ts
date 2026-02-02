import { Effect, Context, Data, Layer } from "effect";

export class DatabaseServiceError extends Data.TaggedError("DatabaseServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

interface DatabaseServiceImpl {
  readonly query: (sql: string) => Effect.Effect<unknown, DatabaseServiceError, never>;
}

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  DatabaseServiceImpl
>() {}

const make = () =>
  Effect.succeed(
    DatabaseService.of({
      query: (_sql) => Effect.succeed({ rows: [] }),
    }),
  );

export const DatabaseServiceLive = Layer.effect(DatabaseService, make());
