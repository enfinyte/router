# ledger

Time-series analytics ledger for LLM request telemetry. Records every LLM API call (provider, model, latency, tokens, cost, errors) into a [TimescaleDB](https://www.timescale.com/) hypertable and exposes pre-aggregated analytics queries for dashboards.

## Tech Stack

- **Database**: [TimescaleDB](https://www.timescale.com/) (PostgreSQL + `timescaledb` + `timescaledb_toolkit` extensions)
- **Migrations**: [dbmate](https://github.com/amacneil/dbmate)
- **Client**: `pg` (raw SQL, no ORM)
- **Runtime**: [Effect-TS](https://effect.website) (services, layers, typed errors)

## Prerequisites

- PostgreSQL with TimescaleDB and timescaledb_toolkit extensions installed
- [dbmate](https://github.com/amacneil/dbmate) CLI (for migrations)

## Setup

```bash
# From repo root
bun install

# Run migrations
cd packages/ledger
DATABASE_URL="postgresql://user:pass@localhost:5432/enfinyte_ledger?sslmode=disable" bun run db:up

# Seed with test data (optional, dev only)
POSTGRES_CONNECTION_STRING="postgres://..." bun run scripts/seed.ts [optional_user_id]
```

## Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `DATABASE_URL` | dbmate CLI | PostgreSQL connection string for migrations |
| `LEDGER_PG_CONNECTION_STRING` | `LedgerService` | PostgreSQL connection string for the runtime service |
| `POSTGRES_CONNECTION_STRING` | `scripts/seed.ts` | PostgreSQL connection string for the seed script |

## Service API

`LedgerService` provides an Effect-TS service with these operations:

| Method | Description |
|--------|-------------|
| `insertTransaction` | Write a single LLM request record |
| `getOverview` | Aggregate stats (total requests, avg/p50/p95/p99 latency, total cost, error rate) |
| `getTimeSeries` | Bucketed time series for charting |
| `getProviderModelLatency` | Per-provider/model latency breakdown |
| `getDailyModelCost` | Per-provider/model cost breakdown |
| `getErrorRate` | Per-provider/model error and rate-limit rates |

All queries are scoped by `userId` and a time interval (`15M`, `1H`, `1D`, `7D`). Reads run against the `llm_metrics_1m` continuous aggregate for performance.

## Database Schema

- **`llm_requests`** — TimescaleDB hypertable (time column: `timestamp`). Stores provider, model, latency, tokens (input/output/reasoning), cost, HTTP status, error messages, categories.
- **`llm_metrics_1m`** — Continuous aggregate: 1-minute buckets with percentile sketches (`uddsketch`)
- **`llm_metrics_1h`** — Continuous aggregate: 1-hour rollup from 1m
- Indexes on `user_id`, `provider+model`, `category`, `http_status_code`, `timestamp`

## Scripts

```bash
bun run db:up        # Apply all pending migrations
bun run db:down      # Roll back last migration
bun run db:status    # Show migration status
bun run db:create    # Create a new migration file
```

## Project Structure

```
.dbmate.yml                  # Migration config
db/
├── schema.sql               # Full schema dump (auto-updated by dbmate)
└── migrations/
    ├── 002_create_llm_requests.sql
    ├── 003_create_indexes.sql
    ├── 004_continuous_aggregate_1m.sql
    ├── 005_continuous_aggregate_1h.sql
    ├── 006_retention_policies.sql
    └── 007_add_user_id_to_aggregates.sql
scripts/
├── seed.ts                  # Inserts realistic test data (5000 rows)
└── seed.json                # Model catalog with weights, latency, cost
src/
├── index.ts                 # LedgerService + layer + fromEnv factory
└── schema.ts                # Transaction, DashboardOverview, TimeSeriesBucket types
```
