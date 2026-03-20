import { Config, Context, Effect, Layer } from "effect";

interface ResolverConfigImpl {
  readonly logLevel: string;
  readonly logFile: string;
}

export class ResolverConfig extends Context.Tag("ResolverConfig")<
  ResolverConfig,
  ResolverConfigImpl
>() {}

export const ResolverConfigLive = Layer.effect(
  ResolverConfig,
  Effect.gen(function* () {
    const logLevel = yield* Config.string("RESOLVER_LOG_LEVEL").pipe(
      Config.withDefault("Info"),
    );
    const logFile = yield* Config.string("RESOLVER_LOG_FILE").pipe(
      Config.withDefault("resolver.log"),
    );

    return ResolverConfig.of({ logLevel, logFile });
  }),
);
