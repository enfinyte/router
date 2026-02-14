import { Context, Effect, Layer } from "effect";
import { sql } from "kysely";

import { DatabaseService, DatabaseServiceError, DatabaseServiceLive } from "../client";
import { SECRETS_TABLE } from "../tables";

interface UserSecrets {
  readonly providers: string[];
  readonly disabledProviders: string[];
}

interface SecretRepositoryImpl {
  getUserSecrets: (userId: string) => Effect.Effect<UserSecrets, DatabaseServiceError>;
  upsertProvider: (userId: string, provider: string) => Effect.Effect<void, DatabaseServiceError>;
  enableProvider: (userId: string, provider: string) => Effect.Effect<void, DatabaseServiceError>;
  disableProvider: (userId: string, provider: string) => Effect.Effect<void, DatabaseServiceError>;
  removeProvider: (userId: string, provider: string) => Effect.Effect<void, DatabaseServiceError>;
}

export class SecretRepository extends Context.Tag("SecretRepository")<
  SecretRepository,
  SecretRepositoryImpl
>() {}

export const SecretRepositoryLive = Layer.effect(
  SecretRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return SecretRepository.of({
      getUserSecrets: (userId) =>
        db
          .use((conn) =>
            conn
              .selectFrom(SECRETS_TABLE)
              .where("userId", "=", userId)
              .select(["providers", "disabledProviders"])
              .executeTakeFirst(),
          )
          .pipe(
            Effect.map((row) => ({
              providers: row?.providers ?? [],
              disabledProviders: row?.disabledProviders ?? [],
            })),
          ),

      upsertProvider: (userId, provider) =>
        db
          .use((conn) =>
            sql`
              INSERT INTO ${sql.table(SECRETS_TABLE)} ("userId", "providers", "updatedAt")
              VALUES (${userId}, ARRAY[${provider}]::text[], CURRENT_TIMESTAMP)
              ON CONFLICT ("userId")
              DO UPDATE SET
                "providers" = CASE
                  WHEN ${provider} = ANY("secrets"."providers") THEN "secrets"."providers"
                  ELSE array_append("secrets"."providers", ${provider})
                END,
                "updatedAt" = CURRENT_TIMESTAMP
            `.execute(conn),
          )
          .pipe(Effect.asVoid),

      enableProvider: (userId, provider) =>
        db
          .use((conn) =>
            conn
              .updateTable(SECRETS_TABLE)
              .set({
                disabledProviders: sql`array_remove("disabledProviders", ${provider})`,
                updatedAt: sql`CURRENT_TIMESTAMP`,
              })
              .where("userId", "=", userId)
              .execute(),
          )
          .pipe(Effect.asVoid),

      disableProvider: (userId, provider) =>
        db
          .use((conn) =>
            sql`
              UPDATE ${sql.table(SECRETS_TABLE)}
              SET "disabledProviders" = CASE
                WHEN ${provider} = ANY("disabledProviders") THEN "disabledProviders"
                ELSE array_append(COALESCE("disabledProviders", '{}'), ${provider})
              END,
              "updatedAt" = CURRENT_TIMESTAMP
              WHERE "userId" = ${userId}
            `.execute(conn),
          )
          .pipe(Effect.asVoid),

      removeProvider: (userId, provider) =>
        db
          .use((conn) =>
            conn
              .updateTable(SECRETS_TABLE)
              .set({
                providers: sql`array_remove("providers", ${provider})`,
                updatedAt: sql`CURRENT_TIMESTAMP`,
              })
              .where("userId", "=", userId)
              .execute(),
          )
          .pipe(Effect.asVoid),
    });
  }),
).pipe(Layer.provide(DatabaseServiceLive));
