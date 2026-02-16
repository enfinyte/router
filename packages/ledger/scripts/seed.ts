/**
 * Usage:
 *   POSTGRES_CONNECTION_STRING="postgres://..." bun run packages/ledger/scripts/seed.ts [user_id]
 *
 * Reads model catalog and config from seed.json.
 * If user_id is omitted, queries the "user" table and picks the first one.
 * Refreshes both continuous aggregates after inserting so the dashboard sees data immediately.
 */

import pg from "pg";
import seedConfig from "./seed.json";

const CONNECTION_STRING = process.env.POSTGRES_CONNECTION_STRING;
if (!CONNECTION_STRING) {
  console.error("ERROR: POSTGRES_CONNECTION_STRING env var is required.");
  process.exit(1);
}

interface ModelSpec {
  provider: string;
  model: string;
  weight: number;
  avgLatencyMs: number;
  avgTtftMs: number;
  avgResolutionMs: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  reasoningCostPer1k: number;
  errorRate: number;
  rateLimitRate: number;
  hasReasoning: boolean;
}

const { rowCount: ROW_COUNT, daysBack: DAYS_BACK, batchSize: BATCH_SIZE, models } = seedConfig;
const MODELS = models as ModelSpec[];
const MODEL_WEIGHTS = MODELS.map((m) => m.weight);

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max));
}

/** Log-normal distribution for realistic latency spread (skewed right) */
function randomLatency(avg: number): number {
  const sigma = 0.5;
  const mu = Math.log(avg) - (sigma * sigma) / 2;
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(10, Math.round(Math.exp(mu + sigma * z)));
}

function pickModel(): ModelSpec {
  const totalWeight = MODEL_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < MODELS.length; i++) {
    const w = MODEL_WEIGHTS[i];
    if (w === undefined) continue;
    r -= w;
    if (r <= 0) {
      const m = MODELS[i];
      if (m) return m;
    }
  }
  return MODELS[0] as ModelSpec;
}

function randomTimestamp(now: Date, daysBack: number): Date {
  const msBack = daysBack * 24 * 60 * 60 * 1000;
  const uniform = new Date(now.getTime() - Math.random() * msBack);
  const biased = new Date(now.getTime() - Math.random() ** 1.3 * msBack);
  return Math.random() > 0.3 ? biased : uniform;
}

function generateRow(now: Date, userId: string) {
  const spec = pickModel();
  const timestamp = randomTimestamp(now, DAYS_BACK);

  const isError = Math.random() < spec.errorRate;
  const isRateLimit = !isError && Math.random() < spec.rateLimitRate;

  let httpStatus: number;
  let errorType: string | null = null;

  if (isRateLimit) {
    httpStatus = 429;
    errorType = "rate_limit_exceeded";
  } else if (isError) {
    const codes = [400, 401, 500, 502, 503];
    httpStatus = codes[randomInt(0, codes.length)] ?? 500;
    errorType =
      httpStatus >= 500
        ? "internal_server_error"
        : httpStatus === 401
          ? "authentication_error"
          : "invalid_request_error";
  } else {
    httpStatus = 200;
  }

  const totalLatency = randomLatency(spec.avgLatencyMs);
  const ttft = randomLatency(spec.avgTtftMs);
  const resolutionLatency = randomLatency(spec.avgResolutionMs);

  const inputTokens = randomInt(50, 4000);
  const outputTokens = httpStatus === 200 ? randomInt(20, 2000) : randomInt(0, 50);
  const reasoningTokens = spec.hasReasoning && httpStatus === 200 ? randomInt(100, 3000) : 0;

  const inputCost = (inputTokens / 1000) * spec.inputCostPer1k;
  const outputCost = (outputTokens / 1000) * spec.outputCostPer1k;
  const reasoningCost = (reasoningTokens / 1000) * spec.reasoningCostPer1k;

  const isStreaming = Math.random() > 0.3;
  const categories = ["chat", "completion", "embedding"] as const;
  const category = categories[randomInt(0, categories.length)] ?? "chat";

  return [
    timestamp,
    crypto.randomUUID(),
    spec.provider,
    spec.model,
    category,
    resolutionLatency,
    ttft,
    totalLatency,
    inputTokens,
    reasoningTokens,
    outputTokens,
    inputCost.toFixed(8),
    reasoningCost.toFixed(8),
    outputCost.toFixed(8),
    httpStatus,
    errorType,
    isStreaming,
    userId,
  ];
}

async function main() {
  const pool = new pg.Pool({ connectionString: CONNECTION_STRING });

  try {
    let userId = process.argv[2];
    if (!userId) {
      console.log("No user_id argument — querying user table...");
      const { rows } = await pool.query<{ id: string; name: string; email: string }>(
        'SELECT id, name, email FROM "user" LIMIT 5',
      );
      if (rows.length === 0) {
        console.error("ERROR: No users found. Sign in via the frontend first, then re-run.");
        process.exit(1);
      }
      if (rows.length === 1) {
        const first = rows[0] as { id: string; name: string; email: string };
        userId = first.id;
        console.log(`Found 1 user: ${first.name} (${first.email}) -> ${userId}`);
      } else {
        console.log("Found multiple users:");
        for (const row of rows) {
          console.log(`  ${row.id}  ${row.name}  ${row.email}`);
        }
        userId = (rows[0] as { id: string }).id;
        console.log(`Using first: ${userId}`);
      }
    }

    console.log(`\nSeeding ${ROW_COUNT} rows for user ${userId} across last ${DAYS_BACK} days...\n`);

    const now = new Date();
    let inserted = 0;

    for (let i = 0; i < ROW_COUNT; i += BATCH_SIZE) {
      const chunk = Math.min(BATCH_SIZE, ROW_COUNT - i);
      const values: unknown[] = [];
      const placeholders: string[] = [];

      for (let j = 0; j < chunk; j++) {
        const row = generateRow(now, userId);
        const offset = j * 18;
        const ph = row.map((_, k) => `$${offset + k + 1}`).join(",");
        placeholders.push(`(${ph})`);
        values.push(...row);
      }

      await pool.query(
        `INSERT INTO llm_requests (
          timestamp, request_id, provider, model, category,
          resolution_latency_ms, ttft_ms, total_latency_ms,
          input_tokens, reasoning_tokens, output_tokens,
          input_cost_usd, reasoning_cost_usd, output_cost_usd,
          http_status_code, error_type, is_streaming, user_id
        ) VALUES ${placeholders.join(",")}`,
        values,
      );

      inserted += chunk;
      process.stdout.write(`\r  Inserted ${inserted}/${ROW_COUNT} rows`);
    }

    console.log("\n\nRefreshing continuous aggregates...");

    await pool.query(
      `CALL refresh_continuous_aggregate('llm_metrics_1m', NOW() - INTERVAL '${String(DAYS_BACK)} days', NOW())`,
    );
    console.log("  llm_metrics_1m refreshed");

    await pool.query(
      `CALL refresh_continuous_aggregate('llm_metrics_1h', NOW() - INTERVAL '${String(DAYS_BACK)} days', NOW())`,
    );
    console.log("  llm_metrics_1h refreshed");

    const { rows: overview } = await pool.query(
      "SELECT count(*) AS total_rows FROM llm_requests WHERE user_id = $1",
      [userId],
    );
    console.log(`\nDone. Total rows for user: ${overview[0]?.total_rows}`);

    const { rows: agg } = await pool.query(
      "SELECT count(*) AS buckets FROM llm_metrics_1m WHERE user_id = $1",
      [userId],
    );
    console.log(`Aggregate buckets (1m): ${agg[0]?.buckets}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
