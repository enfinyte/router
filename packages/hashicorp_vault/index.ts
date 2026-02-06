import { Effect, Context } from "effect";
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

export const addToken = (name: string, token: string) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    yield* Effect.tryPromise({
      try: () =>
        // NOTE: default path, can be changed
        vault.write(`cubbyhole/${name}`, {
          data: {
            token: token,
          },
        }),
      catch: (error) => new VaultWriteError(name, error),
    });
  });

export const getToken = (name: string) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const result = yield* Effect.tryPromise({
      try: () => vault.read(`cubbyhole/${name}`),
      catch: (error) => new VaultReadError(name, error),
    });
    return result.data.data.token;
  });
