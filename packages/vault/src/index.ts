import { Context, Effect, Layer } from "effect";
import { VaultKV, VaultPathError, VaultError, VaultKVLive } from "./kv";

export class VaultService extends Context.Tag("VaultService")<
  VaultService,
  {
    addSecret: (
      userId: string,
      provider: string,
      data: Record<string, string>,
    ) => Effect.Effect<void, VaultError | VaultPathError>;

    getSecret: (
      userId: string,
      provider: string,
    ) => Effect.Effect<Record<string, string>, VaultError | VaultPathError>;

    deleteSecret: (
      userId: string,
      provider: string,
    ) => Effect.Effect<void, VaultError | VaultPathError>;
  }
>() {}

export const VaultServiceLive = Layer.effect(
  VaultService,
  Effect.gen(function* () {
    const kv = yield* VaultKV;

    return VaultService.of({
      addSecret: (userId, provider, data) =>
        kv.makePath(userId, provider).pipe(Effect.flatMap((path) => kv.write(path, data))),

      getSecret: (userId, provider) => kv.makePath(userId, provider).pipe(Effect.flatMap(kv.read)),

      deleteSecret: (userId, provider) =>
        kv.makePath(userId, provider).pipe(Effect.flatMap(kv.delete)),
    });
  }),
).pipe(Layer.provide(VaultKVLive));
