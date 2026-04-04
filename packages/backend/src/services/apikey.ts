import type { VerifyApiKeyResult } from "common";

import { Context, Effect, Layer } from "effect";
import { ProviderModelParseError } from "resolver";
import { parseProviderModelImpl } from "resolver/src/parser";

import type { AuthInstance } from "./auth";

import { DatabaseServiceError } from "../database/client";
import { SecretRepository, SecretRepositoryLive } from "../database/repositories/secret";
import { ApiKeyAlreadyExistsError, ApiKeyNotFoundError, AuthApiError } from "../errors";
import { AuthService, AuthServiceLive } from "./auth";

export interface ApiKeyResponse {
  readonly id: string;
  readonly name: string | null;
  readonly start: string | null;
  readonly prefix: string | null;
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly value?: string;
}

const toApiKeyResponse = (
  key: {
    id: string;
    name: string | null;
    start: string | null;
    prefix: string | null;
    enabled: boolean;
    createdAt: Date;
  },
  value?: string,
): ApiKeyResponse => ({
  id: key.id,
  name: key.name,
  start: key.start,
  prefix: key.prefix,
  enabled: key.enabled,
  createdAt: key.createdAt,
  ...(value !== undefined ? { value } : {}),
});

const tryAuth = <A>(f: () => Promise<A>, message: string) =>
  Effect.tryPromise({
    try: f,
    catch: (cause) => new AuthApiError({ cause, message }),
  });

const assembleUserContext = (
  secrets: {
    getUserSecrets: (userId: string) => Effect.Effect<
      { providers: string[]; disabledProviders: string[] },
      DatabaseServiceError
    >;
    getUserFallback: (userId: string) => Effect.Effect<string, DatabaseServiceError>;
    getUserAnalysisTarget: (userId: string) => Effect.Effect<string, DatabaseServiceError>;
  },
  userId: string,
) =>
  Effect.gen(function* () {
    const userSecrets = yield* secrets
      .getUserSecrets(userId)
      .pipe(
        Effect.catchTag("DatabaseServiceError", (err) =>
          Effect.logError("Failed to fetch user providers during verify").pipe(
            Effect.annotateLogs("cause", String(err.cause)),
            Effect.as({ providers: [] as string[], disabledProviders: [] as string[] }),
          ),
        ),
      );
    const providers = userSecrets.providers.filter(
      (p) => !userSecrets.disabledProviders.includes(p),
    );

    const fallbackProviderModelPairString = yield* secrets.getUserFallback(userId);
    const fallbackProviderModelPair = yield* parseProviderModelImpl(
      fallbackProviderModelPairString,
    );

    const analysisTarget = yield* secrets.getUserAnalysisTarget(userId);

    return { providers, fallbackProviderModelPair, analysisTarget };
  });

interface ApiKeyServiceImpl {
  getKey: (headers: Headers) => Effect.Effect<ApiKeyResponse | null, AuthApiError>;

  createKey: (
    userId: string,
    headers: Headers,
  ) => Effect.Effect<ApiKeyResponse, AuthApiError | ApiKeyAlreadyExistsError>;

  regenerateKey: (userId: string, headers: Headers) => Effect.Effect<ApiKeyResponse, AuthApiError>;

  toggleKey: (
    headers: Headers,
    enabled: boolean,
  ) => Effect.Effect<ApiKeyResponse, AuthApiError | ApiKeyNotFoundError>;

  deleteAllKeys: (headers: Headers) => Effect.Effect<void, AuthApiError | ApiKeyNotFoundError>;

  verifyKey: (
    key: string,
  ) => Effect.Effect<VerifyApiKeyResult, AuthApiError | DatabaseServiceError | ProviderModelParseError>;
}

export class ApiKeyService extends Context.Tag("ApiKeyService")<
  ApiKeyService,
  ApiKeyServiceImpl
>() {}

export const ApiKeyServiceLive = Layer.effect(
  ApiKeyService,
  Effect.gen(function* () {
    const auth = yield* AuthService;
    const secrets = yield* SecretRepository;

    const listKeys = (headers: Headers) =>
      tryAuth(() => auth.api.listApiKeys({ headers }), "Failed to list API keys");

    const createKey = (userId: string) =>
      tryAuth(
        () => auth.api.createApiKey({ body: { name: "default", userId } }),
        "Failed to create API key",
      );

    const deleteKey = (a: AuthInstance, headers: Headers, keyId: string) =>
      tryAuth(
        () => a.api.deleteApiKey({ body: { keyId }, headers }),
        `Failed to delete API key ${keyId}`,
      );

    const updateKey = (
      a: AuthInstance,
      headers: Headers,
      keyId: string,
      data: { enabled: boolean },
    ) =>
      tryAuth(
        () => a.api.updateApiKey({ body: { keyId, ...data }, headers }),
        "Failed to update API key",
      );

    return ApiKeyService.of({
      getKey: (headers) =>
        listKeys(headers).pipe(
          Effect.map(({ apiKeys: result }) => {
            if (!result || result.length === 0) return null;
            return toApiKeyResponse(result[0]!);
          }),
        ),

      createKey: (userId, headers) =>
        Effect.gen(function* () {
          const { apiKeys: existing } = yield* listKeys(headers);
          if (existing && existing.length > 0) {
            return yield* new ApiKeyAlreadyExistsError({
              message: "API key already exists. Use regenerate to replace it.",
            });
          }
          const result = yield* createKey(userId);
          return toApiKeyResponse(result, result.key);
        }),

      regenerateKey: (userId, headers) =>
        Effect.gen(function* () {
          const { apiKeys: existing } = yield* listKeys(headers);
          if (existing && existing.length > 0) {
            yield* Effect.forEach(existing, (key) => deleteKey(auth, headers, key.id));
          }
          const result = yield* createKey(userId);
          return toApiKeyResponse(result, result.key);
        }),

      toggleKey: (headers, enabled) =>
        Effect.gen(function* () {
          const { apiKeys: existing } = yield* listKeys(headers);
          if (!existing || existing.length === 0) {
            return yield* new ApiKeyNotFoundError({ message: "No API key to update" });
          }
          const key = existing[0]!;
          const result = yield* updateKey(auth, headers, key.id, { enabled });
          return toApiKeyResponse(result);
        }),

      deleteAllKeys: (headers) =>
        Effect.gen(function* () {
          const { apiKeys: existing } = yield* listKeys(headers);
          if (!existing || existing.length === 0) {
            return yield* new ApiKeyNotFoundError({ message: "No API key to delete" });
          }
          yield* Effect.forEach(existing, (key) => deleteKey(auth, headers, key.id));
        }),

      verifyKey: (key) =>
        Effect.gen(function* () {
          const result = yield* tryAuth(
            () => auth.api.verifyApiKey({ body: { key } }),
            "Failed to verify API key",
          );

          if (!result.valid) {
            return {
              valid: false as const,
              error: result.error?.message?.toString() ?? "Invalid API key",
            };
          }

          const userId = result.key!.referenceId;
          const { providers, fallbackProviderModelPair, analysisTarget } =
            yield* assembleUserContext(secrets, userId);

          return {
            valid: true as const,
            providers,
            userId,
            fallbackProviderModelPair,
            analysisTarget,
          };
        }),
    });
  }),
).pipe(Layer.provide(AuthServiceLive), Layer.provide(SecretRepositoryLive));
