import { Effect, Context, Data, Layer } from "effect";
import type { ResponseResource } from "../responses/schema";

export class DatabaseServiceError extends Data.TaggedError("DatabaseServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

interface DatabaseServiceImpl {
  persist: (resource: ResponseResource) => Effect.Effect<void, DatabaseServiceError, never>;
}

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  DatabaseServiceImpl
>() {}

const make = () =>
  Effect.succeed(
    DatabaseService.of({
      persist: (_resource) => Effect.void,
    }),
  );

export const DatabaseServiceLive = Layer.effect(DatabaseService, make());
