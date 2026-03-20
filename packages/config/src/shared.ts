import { Config, Context, Effect, Layer } from "effect";

interface RedisConfigImpl {
  readonly url: string;
}

export class RedisConfig extends Context.Tag("RedisConfig")<
  RedisConfig,
  RedisConfigImpl
>() {}

export const RedisConfigLive = Layer.effect(
  RedisConfig,
  Effect.gen(function* () {
    const url = yield* Config.string("REDIS_URL");
    return RedisConfig.of({ url });
  }),
);

export const makeLoggerConfig = (prefix: string, basename: string) =>
  Effect.gen(function* () {
    const logLevel = yield* Config.string(`${prefix}_LOG_LEVEL`).pipe(
      Config.withDefault("Info"),
    );
    const logFile = yield* Config.string(`${prefix}_LOG_FILE`).pipe(
      Config.withDefault(`${basename}.log`),
    );
    return { logLevel, logFile };
  });
