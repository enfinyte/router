import { Config, Context, Data, Effect, Layer } from "effect";
import { Pool, type PoolConfig } from "pg";
import type {
  DashboardOverview,
  ErrorRateMetric,
  LedgerInterval,
  ModelCost,
  ProviderModelLatency,
  TimeSeriesBucket,
  Transaction,
} from "./schema";
import { BUCKET_SQL, INTERVAL_SQL, METRICS_1M_VIEW, TABLE_NAME } from "./schema";

export type {
  DashboardOverview,
  ErrorRateMetric,
  LedgerInterval,
  ModelCost,
  ProviderModelLatency,
  TimeSeriesBucket,
  Transaction,
} from "./schema";

export class LedgerError extends Data.TaggedError("LedgerError")<{
  cause?: unknown;
  message: string;
}> {}

const EMPTY_OVERVIEW: DashboardOverview = {
  total_requests: 0,
  avg_latency_ms: 0,
  p50_latency_ms: 0,
  p95_latency_ms: 0,
  p99_latency_ms: 0,
  avg_resolution_latency_ms: 0,
  total_cost_usd: 0,
  error_rate: 0,
  total_errors: 0,
  total_rate_limits: 0,
};

interface LedgerServiceImpl {
  insertTransaction: (transaction: Transaction) => Effect.Effect<Transaction, LedgerError>;
  getOverview: (
    userId: string,
    interval: LedgerInterval,
  ) => Effect.Effect<DashboardOverview, LedgerError>;
  getTimeSeries: (
    userId: string,
    interval: LedgerInterval,
  ) => Effect.Effect<ReadonlyArray<TimeSeriesBucket>, LedgerError>;
  getProviderModelLatency: (
    userId: string,
    interval: LedgerInterval,
  ) => Effect.Effect<ReadonlyArray<ProviderModelLatency>, LedgerError>;
  getDailyModelCost: (
    userId: string,
    interval: LedgerInterval,
  ) => Effect.Effect<ReadonlyArray<ModelCost>, LedgerError>;
  getErrorRate: (
    userId: string,
    interval: LedgerInterval,
  ) => Effect.Effect<ReadonlyArray<ErrorRateMetric>, LedgerError>;
}

export class LedgerService extends Context.Tag("LedgerService")<
  LedgerService,
  LedgerServiceImpl
>() {}

export const make = (poolConfig: PoolConfig) =>
  Effect.gen(function* () {
    const pool = yield* Effect.acquireRelease(
      Effect.try({
        try: () => new Pool(poolConfig),
        catch: (error) =>
          new LedgerError({ cause: error, message: "Failed to create database pool" }),
      }),
      (pool) => Effect.promise(() => pool.end()),
    );

    return LedgerService.of({
      insertTransaction: (transaction) =>
        Effect.tryPromise({
          try: async () => {
            await pool.query(
              `INSERT INTO ${TABLE_NAME} (
                timestamp, request_id, provider, model, category,
                resolution_latency_ms, ttft_ms, total_latency_ms,
                input_tokens, reasoning_tokens, output_tokens,
                input_cost_usd, reasoning_cost_usd, output_cost_usd,
                http_status_code, error_type, is_streaming, user_id
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
              [
                transaction.timestamp,
                transaction.request_id,
                transaction.provider,
                transaction.model,
                transaction.category,
                transaction.resolution_latency_ms,
                transaction.ttft_ms,
                transaction.total_latency_ms,
                transaction.input_tokens,
                transaction.reasoning_tokens,
                transaction.output_tokens,
                transaction.input_cost_usd,
                transaction.reasoning_cost_usd,
                transaction.output_cost_usd,
                transaction.http_status_code,
                transaction.error_type,
                transaction.is_streaming,
                transaction.user_id,
              ],
            );
            return transaction;
          },
          catch: (error) =>
            new LedgerError({ cause: error, message: "Failed to insert transaction" }),
        }),

      getOverview: (userId, interval) =>
        Effect.tryPromise({
          try: async () => {
            const { rows } = await pool.query<DashboardOverview>(
              `SELECT
                COALESCE(SUM(request_count), 0)::int AS total_requests,
                COALESCE(SUM(avg_latency * request_count) / NULLIF(SUM(request_count), 0), 0)::float8 AS avg_latency_ms,
                COALESCE(approx_percentile(0.5, rollup(latency_pct)), 0)::float8 AS p50_latency_ms,
                COALESCE(approx_percentile(0.95, rollup(latency_pct)), 0)::float8 AS p95_latency_ms,
                COALESCE(approx_percentile(0.99, rollup(latency_pct)), 0)::float8 AS p99_latency_ms,
                COALESCE(SUM(avg_resolution_latency * request_count) / NULLIF(SUM(request_count), 0), 0)::float8 AS avg_resolution_latency_ms,
                COALESCE(SUM(total_cost), 0)::float8 AS total_cost_usd,
                COALESCE(SUM(error_count)::float8 / NULLIF(SUM(request_count)::float8, 0), 0)::float8 AS error_rate,
                COALESCE(SUM(error_count), 0)::int AS total_errors,
                COALESCE(SUM(rate_limit_count), 0)::int AS total_rate_limits
              FROM ${METRICS_1M_VIEW}
              WHERE user_id = $1
                AND bucket >= NOW() - $2::interval`,
              [userId, INTERVAL_SQL[interval]],
            );
            return rows[0] ?? EMPTY_OVERVIEW;
          },
          catch: (error) =>
            new LedgerError({ cause: error, message: "Failed to get dashboard overview" }),
        }),

      getTimeSeries: (userId, interval) =>
        Effect.tryPromise({
          try: async () => {
            const { rows } = await pool.query<TimeSeriesBucket>(
              `SELECT
                time_bucket($3::interval, bucket) AS bucket,
                COALESCE(SUM(request_count), 0)::int AS request_count,
                COALESCE(SUM(avg_latency * request_count) / NULLIF(SUM(request_count), 0), 0)::float8 AS avg_latency_ms,
                COALESCE(SUM(avg_resolution_latency * request_count) / NULLIF(SUM(request_count), 0), 0)::float8 AS avg_resolution_latency_ms,
                COALESCE(SUM(total_cost), 0)::float8 AS total_cost_usd,
                COALESCE(SUM(error_count), 0)::int AS error_count,
                COALESCE(SUM(rate_limit_count), 0)::int AS rate_limit_count
              FROM ${METRICS_1M_VIEW}
              WHERE user_id = $1
                AND bucket >= NOW() - $2::interval
              GROUP BY time_bucket($3::interval, bucket)
              ORDER BY bucket ASC`,
              [userId, INTERVAL_SQL[interval], BUCKET_SQL[interval]],
            );
            return rows;
          },
          catch: (error) => new LedgerError({ cause: error, message: "Failed to get time series" }),
        }),

      getProviderModelLatency: (userId, interval) =>
        Effect.tryPromise({
          try: async () => {
            const { rows } = await pool.query<ProviderModelLatency>(
              `SELECT
                provider,
                model,
                COALESCE(SUM(avg_latency * request_count) / NULLIF(SUM(request_count), 0), 0)::float8 AS avg_latency_ms,
                COALESCE(approx_percentile(0.5, rollup(latency_pct)), 0)::float8 AS p50_latency_ms,
                COALESCE(approx_percentile(0.95, rollup(latency_pct)), 0)::float8 AS p95_latency_ms,
                COALESCE(approx_percentile(0.99, rollup(latency_pct)), 0)::float8 AS p99_latency_ms,
                COALESCE(SUM(avg_ttft * request_count) / NULLIF(SUM(request_count), 0), 0)::float8 AS avg_ttft_ms,
                COALESCE(SUM(avg_resolution_latency * request_count) / NULLIF(SUM(request_count), 0), 0)::float8 AS avg_resolution_latency_ms,
                COALESCE(SUM(request_count), 0)::int AS request_count
              FROM ${METRICS_1M_VIEW}
              WHERE user_id = $1
                AND bucket >= NOW() - $2::interval
              GROUP BY provider, model
              ORDER BY avg_latency_ms DESC`,
              [userId, INTERVAL_SQL[interval]],
            );
            return rows;
          },
          catch: (error) =>
            new LedgerError({ cause: error, message: "Failed to get provider model latency" }),
        }),

      getDailyModelCost: (userId, interval) =>
        Effect.tryPromise({
          try: async () => {
            const { rows } = await pool.query<ModelCost>(
              `SELECT
                provider,
                model,
                COALESCE(SUM(total_cost), 0)::float8 AS total_cost_usd,
                COALESCE(SUM(total_input_tokens), 0)::int AS total_input_tokens,
                COALESCE(SUM(total_output_tokens), 0)::int AS total_output_tokens,
                COALESCE(SUM(total_reasoning_tokens), 0)::int AS total_reasoning_tokens
              FROM ${METRICS_1M_VIEW}
              WHERE user_id = $1
                AND bucket >= NOW() - $2::interval
              GROUP BY provider, model
              ORDER BY total_cost_usd DESC`,
              [userId, INTERVAL_SQL[interval]],
            );
            return rows;
          },
          catch: (error) =>
            new LedgerError({ cause: error, message: "Failed to get daily model cost" }),
        }),

      getErrorRate: (userId, interval) =>
        Effect.tryPromise({
          try: async () => {
            const { rows } = await pool.query<ErrorRateMetric>(
              `SELECT
                provider,
                model,
                COALESCE(SUM(request_count), 0)::int AS request_count,
                COALESCE(SUM(error_count), 0)::int AS error_count,
                COALESCE(SUM(rate_limit_count), 0)::int AS rate_limit_count,
                COALESCE(SUM(error_count)::float8 / NULLIF(SUM(request_count)::float8, 0), 0)::float8 AS error_rate
              FROM ${METRICS_1M_VIEW}
              WHERE user_id = $1
                AND bucket >= NOW() - $2::interval
              GROUP BY provider, model
              ORDER BY error_rate DESC`,
              [userId, INTERVAL_SQL[interval]],
            );
            return rows;
          },
          catch: (error) => new LedgerError({ cause: error, message: "Failed to get error rate" }),
        }),
    });
  });

export const layer = (poolConfig: PoolConfig) => Layer.scoped(LedgerService, make(poolConfig));

export const fromEnv = Layer.scoped(
  LedgerService,
  Effect.gen(function* () {
    const connectionString = yield* Config.string("LEDGER_PG_CONNECTION_STRING");
    return yield* make({ connectionString });
  }),
);
