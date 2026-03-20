import { Config, Context, Effect, Layer } from "effect";

interface LedgerConfigImpl {
  readonly pgUrl: string;
}

export class LedgerConfig extends Context.Tag("LedgerConfig")<
  LedgerConfig,
  LedgerConfigImpl
>() {}

export const LedgerConfigLive = Layer.effect(
  LedgerConfig,
  Effect.gen(function* () {
    const pgUrl = yield* Config.string("LEDGER_PG_URL");

    return LedgerConfig.of({ pgUrl });
  }),
);
