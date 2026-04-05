import { Effect } from "effect";

const log = (service: string) => (operation: string) => ({
  info: (message: string, extra?: Record<string, unknown>) =>
    Effect.logInfo(message).pipe(Effect.annotateLogs({ service, operation, ...extra })),
  debug: (message: string, extra?: Record<string, unknown>) =>
    Effect.logDebug(message).pipe(Effect.annotateLogs({ service, operation, ...extra })),
  error: (message: string, extra?: Record<string, unknown>) =>
    Effect.logError(message).pipe(Effect.annotateLogs({ service, operation, ...extra })),
  warn: (message: string, extra?: Record<string, unknown>) =>
    Effect.logWarning(message).pipe(Effect.annotateLogs({ service, operation, ...extra })),
});

export const resolverLog = log("Resolver");
export const dataManagerLog = log("DataManager");
