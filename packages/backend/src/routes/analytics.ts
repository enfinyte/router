import { Effect, Schema } from "effect";
import { Hono } from "hono";
import { LedgerService } from "ledger";
import { getAuthenticatedUser } from "../middleware/auth";
import { RequestValidationError } from "../errors";
import { IntervalSchema } from "../schemas";
import { runHandler } from "../runtime";

const parseInterval = (raw: string | undefined) =>
  Schema.decodeUnknown(IntervalSchema)(raw).pipe(
    Effect.mapError(
      () => new RequestValidationError({ message: "interval must be one of: 15M, 1H, 1D, 7D" }),
    ),
  );

export const analyticsRoute = new Hono().basePath("/analytics");

analyticsRoute.get("/overview", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const interval = yield* parseInterval(c.req.query("interval"));
      const ledger = yield* LedgerService;
      const overview = yield* ledger.getOverview(user.id, interval);
      return c.json({ overview });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
        LedgerError: (err) =>
          Effect.logError("GET /v1/analytics/overview failed", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to fetch overview" }, 500)),
          ),
      }),
    ),
  ),
);

analyticsRoute.get("/timeseries", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const interval = yield* parseInterval(c.req.query("interval"));
      const ledger = yield* LedgerService;
      const timeseries = yield* ledger.getTimeSeries(user.id, interval);
      return c.json({ timeseries });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
        LedgerError: (err) =>
          Effect.logError("GET /v1/analytics/timeseries failed", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to fetch time series" }, 500)),
          ),
      }),
    ),
  ),
);

analyticsRoute.get("/latency", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const interval = yield* parseInterval(c.req.query("interval"));
      const ledger = yield* LedgerService;
      const latency = yield* ledger.getProviderModelLatency(user.id, interval);
      return c.json({ latency });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
        LedgerError: (err) =>
          Effect.logError("GET /v1/analytics/latency failed", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to fetch latency data" }, 500)),
          ),
      }),
    ),
  ),
);

analyticsRoute.get("/cost", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const interval = yield* parseInterval(c.req.query("interval"));
      const ledger = yield* LedgerService;
      const cost = yield* ledger.getDailyModelCost(user.id, interval);
      return c.json({ cost });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
        LedgerError: (err) =>
          Effect.logError("GET /v1/analytics/cost failed", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to fetch cost data" }, 500)),
          ),
      }),
    ),
  ),
);

analyticsRoute.get("/errors", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const interval = yield* parseInterval(c.req.query("interval"));
      const ledger = yield* LedgerService;
      const errors = yield* ledger.getErrorRate(user.id, interval);
      return c.json({ errors });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
        LedgerError: (err) =>
          Effect.logError("GET /v1/analytics/errors failed", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to fetch error rate data" }, 500)),
          ),
      }),
    ),
  ),
);
