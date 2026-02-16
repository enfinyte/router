import { appendFileSync, writeFileSync } from "node:fs";
import { Config, Effect, HashMap, Layer, Logger, LogLevel } from "effect";

const LOG_LEVEL_MAP: Record<string, LogLevel.LogLevel> = {
  All: LogLevel.All,
  Trace: LogLevel.Trace,
  Debug: LogLevel.Debug,
  Info: LogLevel.Info,
  Warning: LogLevel.Warning,
  Error: LogLevel.Error,
  Fatal: LogLevel.Fatal,
  None: LogLevel.None,
};

const formatAnnotations = (
  annotations: HashMap.HashMap<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of HashMap.toEntries(annotations)) {
    result[key] = value;
  }
  return result;
};

const fileLogger = (filePath: string) =>
  Logger.make<unknown, void>(({ logLevel, message, date, annotations }) => {
    const annots = formatAnnotations(annotations);
    const entry = JSON.stringify({
      timestamp: date.toISOString(),
      level: logLevel.label,
      message: String(message),
      ...(Object.keys(annots).length > 0 ? { annotations: annots } : {}),
    });
    Effect.sync(() => appendFileSync(filePath, entry + "\n")).pipe(Effect.ignore, Effect.runSync);
  });

export const ResolverLoggerLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const logLevelStr = yield* Config.string("RESOLVER_LOG_LEVEL").pipe(Config.withDefault("Info"));
    const logFile = yield* Config.string("RESOLVER_LOG_FILE").pipe(
      Config.withDefault("resolver.log"),
    );

    const level = LOG_LEVEL_MAP[logLevelStr] ?? LogLevel.Info;

    // Ensure the log file exists (append mode — does not truncate)
    yield* Effect.sync(() => writeFileSync(logFile, "", { flag: "a" })).pipe(Effect.ignore);

    const file = fileLogger(logFile);

    return Layer.mergeAll(Logger.add(file), Logger.minimumLogLevel(level));
  }),
);
