import { Context, Effect, Layer } from "effect";
import { sql } from "kysely";

import { DatabaseService, DatabaseServiceError, DatabaseServiceLive } from "../client";
import { SECRETS_TABLE, USER_TABLE } from "../tables";

interface UserSecrets {
  readonly providers: string[];
  readonly disabledProviders: string[];
}

interface SecretRepositoryImpl {
  getUserSecrets: (userId: string) => Effect.Effect<UserSecrets, DatabaseServiceError>;
  getUserFallback: (userId: string) => Effect.Effect<string | undefined, DatabaseServiceError>;
  getUserAnalysisTarget: (userId: string) => Effect.Effect<string | undefined, DatabaseServiceError>;
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

      getUserFallback: (userId) =>
        db
          .use((conn) =>
            conn
              .selectFrom(USER_TABLE)
              .where("id", "=", userId)
              .select(["fallbackProviderModelPair"])
              .executeTakeFirst(),
          )
          .pipe(
            Effect.map((row) => row?.fallbackProviderModelPair ?? undefined),
          ),

      getUserAnalysisTarget: (userId) =>
        db
          .use((conn) =>
            conn
              .selectFrom(USER_TABLE)
              .where("id", "=", userId)
              .select(["analysisTarget"])
              .executeTakeFirst(),
          )
          .pipe(
            Effect.map((row) => row?.analysisTarget ?? undefined),
          ),

      upsertProvider: (userId, provider) =>
        Effect.gen(function* () {
          const existing = yield* db.use((conn) =>
            conn
              .selectFrom(SECRETS_TABLE)
              .where("userId", "=", userId)
              .select(["userId"])
              .executeTakeFirst(),
          );

          if (existing) {
            yield* db.use((conn) =>
              sql`
                UPDATE ${sql.table(SECRETS_TABLE)}
                SET "providers" = CASE
                  WHEN COALESCE("providers", '[]'::jsonb) @> to_jsonb(CAST(${provider} AS text)) THEN "providers"
                  ELSE COALESCE("providers", '[]'::jsonb) || to_jsonb(CAST(${provider} AS text))
                END,
                "updatedAt" = CURRENT_TIMESTAMP
                WHERE "userId" = ${userId}
              `.execute(conn),
            );
          } else {
            yield* db.use((conn) =>
              sql`
                INSERT INTO ${sql.table(SECRETS_TABLE)} ("id", "userId", "providers", "createdAt", "updatedAt")
                VALUES (gen_random_uuid(), ${userId}, jsonb_build_array(CAST(${provider} AS text)), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `.execute(conn),
            );
          }
        }).pipe(Effect.asVoid),

      enableProvider: (userId, provider) =>
        db
          .use((conn) =>
            sql`
              UPDATE ${sql.table(SECRETS_TABLE)}
              SET "disabledProviders" = COALESCE(
                (SELECT jsonb_agg(elem) FROM jsonb_array_elements("disabledProviders") elem WHERE elem #>> '{}' != CAST(${provider} AS text)),
                '[]'::jsonb
              ),
              "updatedAt" = CURRENT_TIMESTAMP
              WHERE "userId" = ${userId}
            `.execute(conn),
          )
          .pipe(Effect.asVoid),

      disableProvider: (userId, provider) =>
        db
          .use((conn) =>
            sql`
              UPDATE ${sql.table(SECRETS_TABLE)}
              SET "disabledProviders" = CASE
                WHEN COALESCE("disabledProviders", '[]'::jsonb) @> to_jsonb(CAST(${provider} AS text)) THEN "disabledProviders"
                ELSE COALESCE("disabledProviders", '[]'::jsonb) || to_jsonb(CAST(${provider} AS text))
              END,
              "updatedAt" = CURRENT_TIMESTAMP
              WHERE "userId" = ${userId}
            `.execute(conn),
          )
          .pipe(Effect.asVoid),

      removeProvider: (userId, provider) =>
        db
          .use((conn) =>
            sql`
              UPDATE ${sql.table(SECRETS_TABLE)}
              SET "providers" = COALESCE(
                (SELECT jsonb_agg(elem) FROM jsonb_array_elements("providers") elem WHERE elem #>> '{}' != CAST(${provider} AS text)),
                '[]'::jsonb
              ),
              "updatedAt" = CURRENT_TIMESTAMP
              WHERE "userId" = ${userId}
            `.execute(conn),
          )
          .pipe(Effect.asVoid),
    });
  }),
).pipe(Layer.provide(DatabaseServiceLive));
