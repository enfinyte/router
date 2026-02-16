import { Context, Effect, Layer } from "effect";
import type { VaultError, VaultPathError } from "./kv";
import { VaultKV, VaultKVLive } from "./kv";

export { VaultError, VaultPathError } from "./kv";
export { VaultLoggerLive } from "./logger";

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

    yield* Effect.logInfo("VaultService initialized").pipe(
      Effect.annotateLogs({ service: "VaultService" }),
    );

    return VaultService.of({
      addSecret: (userId, provider, data) =>
        Effect.logInfo("Adding secret").pipe(
          Effect.annotateLogs({
            service: "VaultService",
            operation: "addSecret",
            userId,
            provider,
          }),
          Effect.flatMap(() =>
            kv.makePath(userId, provider).pipe(Effect.flatMap((path) => kv.write(path, data))),
          ),
          Effect.tap(() =>
            Effect.logInfo("Secret added").pipe(
              Effect.annotateLogs({
                service: "VaultService",
                operation: "addSecret",
                userId,
                provider,
              }),
            ),
          ),
          Effect.tapError((err) =>
            Effect.logError("Failed to add secret").pipe(
              Effect.annotateLogs({
                service: "VaultService",
                operation: "addSecret",
                userId,
                provider,
                error: err._tag,
                message: err.message,
              }),
            ),
          ),
        ),

      getSecret: (userId, provider) =>
        Effect.logInfo("Getting secret").pipe(
          Effect.annotateLogs({
            service: "VaultService",
            operation: "getSecret",
            userId,
            provider,
          }),
          Effect.flatMap(() => kv.makePath(userId, provider).pipe(Effect.flatMap(kv.read))),
          Effect.tap((_) =>
            Effect.logInfo("Secret retrieved").pipe(
              Effect.annotateLogs({
                service: "VaultService",
                operation: "getSecret",
                userId,
                provider,
              }),
            ),
          ),
          Effect.tapError((err) =>
            Effect.logError("Failed to get secret").pipe(
              Effect.annotateLogs({
                service: "VaultService",
                operation: "getSecret",
                userId,
                provider,
                error: err._tag,
                message: err.message,
              }),
            ),
          ),
        ),

      deleteSecret: (userId, provider) =>
        Effect.logInfo("Deleting secret").pipe(
          Effect.annotateLogs({
            service: "VaultService",
            operation: "deleteSecret",
            userId,
            provider,
          }),
          Effect.flatMap(() => kv.makePath(userId, provider).pipe(Effect.flatMap(kv.delete))),
          Effect.tap(() =>
            Effect.logInfo("Secret deleted").pipe(
              Effect.annotateLogs({
                service: "VaultService",
                operation: "deleteSecret",
                userId,
                provider,
              }),
            ),
          ),
          Effect.tapError((err) =>
            Effect.logError("Failed to delete secret").pipe(
              Effect.annotateLogs({
                service: "VaultService",
                operation: "deleteSecret",
                userId,
                provider,
                error: err._tag,
                message: err.message,
              }),
            ),
          ),
        ),
    });
  }),
).pipe(Layer.provide(VaultKVLive));
