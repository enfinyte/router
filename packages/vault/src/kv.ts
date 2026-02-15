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
    Effect.mapError(
      () =>
        new VaultPathError({
          message: `Invalid ${label}: ${value}`,
        }),
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
        catch: (cause) => {
          return new VaultError({
            cause,
            message,
          });
        },
      });

    return VaultKV.of({
      write: (path, data) =>
        tryVault(() => vault.write(path.data, { data }), "Vault write failed").pipe(Effect.asVoid),

      read: (path) =>
        tryVault(() => vault.read(path.data), "Vault read failed").pipe(
          Effect.map((r) => r.data.data),
          Effect.flatMap(Schema.decodeUnknown(SecretSchema)),
          Effect.mapError(
            (cause) =>
              new VaultError({
                cause,
                message: "Invalid Vault response",
              }),
          ),
        ),

      delete: (path) =>
        tryVault(() => vault.delete(path.metadata), "Vault delete failed").pipe(Effect.asVoid),

      makePath: (userId: string, provider: string) =>
        Effect.all({
          userId: segment(userId, "userId"),
          provider: segment(provider, "provider"),
        }).pipe(Effect.map(({ userId, provider }) => new VaultPath(mountRoot, userId, provider))),
    });
  }),
).pipe(Layer.provide(VaultClientLive));
