import { Context, Data, Effect, Layer, Schema } from "effect";
import { VaultClient, VaultClientLive } from "./client";

export class VaultError extends Data.TaggedError("VaultError")<{
  cause?: unknown;
  message?: string;
}> {}

export class VaultPathError extends Data.TaggedError("VaultPathError")<{
  message: string;
}> {}

const mountRoot = "secret";

const SAFE_SEGMENT = /^[a-zA-Z0-9_\-.:@]+$/;

export const SafeSegment = Schema.String.pipe(Schema.filter((s) => SAFE_SEGMENT.test(s)));

type SafeSegment = Schema.Schema.Type<typeof SafeSegment>;

const segment = (value: string, label: string) =>
  Schema.decodeUnknown(SafeSegment)(value).pipe(
    Effect.mapError(() => {
      const error = new VaultPathError({
        message: `Invalid ${label}: ${value}`,
      });
      return error;
    }),
    Effect.tapError(() =>
      Effect.logWarning(`Path segment validation failed: invalid ${label}`).pipe(
        Effect.annotateLogs({ service: "VaultKV", operation: "segment", label, value }),
      ),
    ),
  );

class VaultPath {
  constructor(
    readonly mount: string,
    readonly userId: SafeSegment,
    readonly provider: SafeSegment,
  ) {}

  get data(): string {
    return `${this.mount}/data/${this.userId}/${this.provider}`;
  }

  get metadata(): string {
    return `${this.mount}/metadata/${this.userId}/${this.provider}`;
  }
}

export class VaultKV extends Context.Tag("VaultKV")<
  VaultKV,
  {
    write: (path: VaultPath, data: Record<string, string>) => Effect.Effect<void, VaultError>;

    read: (path: VaultPath) => Effect.Effect<Record<string, string>, VaultError>;

    delete: (path: VaultPath) => Effect.Effect<void, VaultError>;

    makePath: (userId: string, provider: string) => Effect.Effect<VaultPath, VaultPathError>;
  }
>() {}

const SecretSchema = Schema.Record({
  key: Schema.String,
  value: Schema.String,
});

export const VaultKVLive = Layer.effect(
  VaultKV,
  Effect.gen(function* () {
    const vault = yield* VaultClient;

    const tryVault = <A>(f: () => Promise<A>, message: string) =>
      Effect.tryPromise({
        try: f,
        catch: (cause) =>
          new VaultError({
            cause,
            message,
          }),
      }).pipe(
        Effect.tapError((err) =>
          Effect.logError(message).pipe(
            Effect.annotateLogs({
              service: "VaultKV",
              cause: err.cause instanceof Error ? err.cause.message : String(err.cause),
            }),
          ),
        ),
      );

    yield* Effect.logInfo("VaultKV service initialized").pipe(
      Effect.annotateLogs({ service: "VaultKV" }),
    );

    return VaultKV.of({
      write: (path, data) =>
        Effect.logDebug("Writing secret").pipe(
          Effect.annotateLogs({
            service: "VaultKV",
            operation: "write",
            path: path.data,
            keys: Object.keys(data).join(","),
          }),
          Effect.flatMap(() =>
            tryVault(() => vault.write(path.data, { data }), "Vault write failed"),
          ),
          Effect.tap(() =>
            Effect.logInfo("Secret written").pipe(
              Effect.annotateLogs({
                service: "VaultKV",
                operation: "write",
                path: path.data,
              }),
            ),
          ),
          Effect.asVoid,
        ),

      read: (path) =>
        Effect.logDebug("Reading secret").pipe(
          Effect.annotateLogs({
            service: "VaultKV",
            operation: "read",
            path: path.data,
          }),
          Effect.flatMap(() => tryVault(() => vault.read(path.data), "Vault read failed")),
          Effect.map((r) => r.data.data),
          Effect.flatMap((raw) =>
            Schema.decodeUnknown(SecretSchema)(raw).pipe(
              Effect.tapError((parseError) =>
                Effect.logError("Invalid Vault response: schema decode failed").pipe(
                  Effect.annotateLogs({
                    service: "VaultKV",
                    operation: "read",
                    path: path.data,
                    cause: String(parseError),
                  }),
                ),
              ),
              Effect.mapError(
                (cause) =>
                  new VaultError({
                    cause,
                    message: "Invalid Vault response",
                  }),
              ),
            ),
          ),
          Effect.tap((result) =>
            Effect.logInfo("Secret read").pipe(
              Effect.annotateLogs({
                service: "VaultKV",
                operation: "read",
                path: path.data,
                keyCount: Object.keys(result).length,
              }),
            ),
          ),
        ),

      delete: (path) =>
        Effect.logDebug("Deleting secret").pipe(
          Effect.annotateLogs({
            service: "VaultKV",
            operation: "delete",
            path: path.metadata,
          }),
          Effect.flatMap(() => tryVault(() => vault.delete(path.metadata), "Vault delete failed")),
          Effect.tap(() =>
            Effect.logInfo("Secret deleted").pipe(
              Effect.annotateLogs({
                service: "VaultKV",
                operation: "delete",
                path: path.metadata,
              }),
            ),
          ),
          Effect.asVoid,
        ),

      makePath: (userId: string, provider: string) =>
        Effect.all({
          userId: segment(userId, "userId"),
          provider: segment(provider, "provider"),
        }).pipe(
          Effect.map(({ userId, provider }) => new VaultPath(mountRoot, userId, provider)),
          Effect.tap((vaultPath) =>
            Effect.logDebug("VaultPath constructed").pipe(
              Effect.annotateLogs({
                service: "VaultKV",
                operation: "makePath",
                dataPath: vaultPath.data,
                metadataPath: vaultPath.metadata,
              }),
            ),
          ),
        ),
    });
  }),
).pipe(Layer.provide(VaultClientLive));
