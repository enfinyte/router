import { Config, Context, Data, Effect, Layer, Schema } from "effect";
import Vault from "node-vault";

export class VaultService extends Context.Tag("VaultService")<
  VaultService,
  ReturnType<typeof Vault>
>() {}

export class VaultWriteError extends Data.TaggedError("VaultWriteError")<{
  cause?: unknown;
  message?: string;
}> {}

export class VaultReadError extends Data.TaggedError("VaultReadError")<{
  cause?: unknown;
  message?: string;
}> {}

export class VaultDeleteError extends Data.TaggedError("VaultDeleteError")<{
  cause?: unknown;
  message?: string;
}> {}

export class VaultPathError extends Data.TaggedError("VaultPathError")<{
  message: string;
}> {}

const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9_\-.:@]+$/;

const SafePathSegment = Schema.String.pipe(
  Schema.filter((s) => SAFE_PATH_SEGMENT.test(s), {
    message: () =>
      "Path segment must only contain alphanumeric characters, hyphens, underscores, dots, colons, or @",
  }),
);

const validatePathSegment = (segment: string, label: string) =>
  Schema.decodeUnknown(SafePathSegment)(segment).pipe(
    Effect.mapError(
      () =>
        new VaultPathError({
          message: `Invalid ${label}: "${segment}" contains unsafe characters`,
        }),
    ),
  );

const KV_MOUNT = "secret";

const dataPath = (userId: string, provider: string): string =>
  `${KV_MOUNT}/data/${userId}/${provider}`;

const metadataPath = (userId: string, provider: string): string =>
  `${KV_MOUNT}/metadata/${userId}/${provider}`;

export const addSecret = (userId: string, provider: string, data: Record<string, string>) =>
  Effect.gen(function* () {
    yield* validatePathSegment(userId, "userId");
    yield* validatePathSegment(provider, "provider");

    const vault = yield* VaultService;
    yield* Effect.tryPromise({
      try: () => vault.write(dataPath(userId, provider), { data }),
      catch: (error) =>
        new VaultWriteError({ cause: error, message: `Failed to write secret for ${provider}` }),
    });
  });

export const getSecret = (userId: string, provider: string) =>
  Effect.gen(function* () {
    yield* validatePathSegment(userId, "userId");
    yield* validatePathSegment(provider, "provider");

    const vault = yield* VaultService;
    const result = yield* Effect.tryPromise({
      try: () => vault.read(dataPath(userId, provider)),
      catch: (error) =>
        new VaultReadError({ cause: error, message: `Failed to read secret for ${provider}` }),
    });

    const raw: unknown = result?.data?.data;
    if (raw === null || raw === undefined || typeof raw !== "object") {
      return yield* new VaultReadError({
        message: `Unexpected response shape from Vault for ${provider}`,
      });
    }
    return raw as Record<string, string>;
  });

export const deleteSecret = (userId: string, provider: string) =>
  Effect.gen(function* () {
    yield* validatePathSegment(userId, "userId");
    yield* validatePathSegment(provider, "provider");

    const vault = yield* VaultService;
    yield* Effect.tryPromise({
      try: () => vault.delete(metadataPath(userId, provider)),
      catch: (error) =>
        new VaultDeleteError({
          cause: error,
          message: `Failed to delete secret for ${provider}`,
        }),
    });
  });

const vaultConfig = Config.all({
  endpoint: Config.string("VAULT_ADDR").pipe(Config.withDefault("http://127.0.0.1:8200")),
  token: Config.option(Config.string("VAULT_TOKEN")),
});

export const VaultServiceLive = Layer.effect(
  VaultService,
  Effect.gen(function* () {
    const { endpoint, token } = yield* vaultConfig;
    return VaultService.of(
      Vault({
        endpoint,
        ...(token._tag === "Some" ? { token: token.value } : {}),
      }),
    );
  }),
);
