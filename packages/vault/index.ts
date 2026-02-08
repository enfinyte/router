import { Effect, Context, Layer } from "effect";
import Vault from "node-vault";

export class VaultService extends Context.Tag("VaultService")<
  VaultService,
  ReturnType<typeof Vault>
>() {}

export class VaultWriteError {
  readonly _tag = "VaultWriteError";
  constructor(
    readonly name: string,
    readonly cause: unknown,
  ) {}
}

export class VaultReadError {
  readonly _tag = "VaultReadError";
  constructor(
    readonly name: string,
    readonly cause: unknown,
  ) {}
}

export class VaultDeleteError {
  readonly _tag = "VaultDeleteError";
  constructor(
    readonly name: string,
    readonly cause: unknown,
  ) {}
}

const KV_MOUNT = "secret";

function dataPath(userId: string, provider: string): string {
  return `${KV_MOUNT}/data/${userId}/${provider}`;
}

function metadataPath(userId: string, provider: string): string {
  return `${KV_MOUNT}/metadata/${userId}/${provider}`;
}

export const addSecret = (provider: string, userId: string, data: Record<string, string>) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    yield* Effect.tryPromise({
      try: () => vault.write(dataPath(userId, provider), { data }),
      catch: (error) => new VaultWriteError(provider, error),
    });
  });

export const getSecret = (userId: string, provider: string) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const result = yield* Effect.tryPromise({
      try: () => vault.read(dataPath(userId, provider)),
      catch: (error) => new VaultReadError(provider, error),
    });
    return result.data.data as Record<string, string>;
  });

export const deleteSecret = (userId: string, provider: string) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    yield* Effect.tryPromise({
      try: () => vault.delete(metadataPath(userId, provider)),
      catch: (error) => new VaultDeleteError(provider, error),
    });
  });

export const VaultServiceLive = Layer.succeed(
  VaultService,
  Vault({
    endpoint: process.env.VAULT_ADDR || "http://127.0.0.1:8200",
    ...(process.env.VAULT_TOKEN ? { token: process.env.VAULT_TOKEN } : {}),
  }),
);

export * from "./init";
