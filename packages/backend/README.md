# backend

Control plane API for the LLM router platform. Handles user authentication, API key lifecycle, provider credential management, and usage analytics. This is the management layer — the actual LLM routing lives in `api_platform`.

## Tech Stack

- **HTTP**: [Hono](https://hono.dev/)
- **Auth**: [better-auth](https://www.better-auth.com/) (email/password + GitHub OAuth + API key plugin)
- **Database**: [Kysely](https://kysely.dev/) + PostgreSQL
- **Secrets**: [`vault`](../vault) (workspace package)
- **Analytics**: [`ledger`](../ledger) (workspace package)
- **Runtime**: [Effect-TS](https://effect.website) (services, layers, typed errors)

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- PostgreSQL
- Running [Vault](../vault) instance
- GitHub OAuth app (for social login)

## Setup

```bash
# From repo root
bun install

# Configure environment
cd packages/backend
cp .env .env.local  # edit with your values

# Start the server
bun run src/index.ts
```

Default port: **8000**

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8000` | HTTP server port |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |
| `BETTER_AUTH_BASE_URL` | No | `http://localhost:8000` | better-auth base URL |
| `POSTGRES_CONNECTION_STRING` | **Yes** | — | PostgreSQL for auth + secrets |
| `GITHUB_CLIENT_ID` | **Yes** | — | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | **Yes** | — | GitHub OAuth app client secret |
| `BETTER_AUTH_SECRET` | **Yes** | — | better-auth signing secret |
| `VAULT_TOKEN_KEY` | **Yes** | — | Vault encryption key |
| `VAULT_TOKEN` | **Yes** | — | Vault access token |
| `LEDGER_PG_CONNECTION_STRING` | **Yes** | — | PostgreSQL for analytics (ledger DB) |

## API Endpoints

### Auth (better-auth managed)

```
POST/GET  /api/auth/*   — sign-up, sign-in, sessions, OAuth callbacks
```

### API Keys — `/v1/apikey`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/apikey` | Yes | Get current API key |
| `POST` | `/v1/apikey` | Yes | Create API key (one per user) |
| `PUT` | `/v1/apikey` | Yes | Regenerate API key |
| `PATCH` | `/v1/apikey` | Yes | Enable/disable API key |
| `DELETE` | `/v1/apikey` | Yes | Delete all API keys |
| `POST` | `/v1/apikey/verify` | **No** | Verify a key + return enabled providers |

### Provider Secrets — `/v1/secret`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/secret` | Yes | List configured providers |
| `POST` | `/v1/secret` | Yes | Add/update provider credentials |
| `PATCH` | `/v1/secret/:provider` | Yes | Enable/disable a provider |
| `DELETE` | `/v1/secret/:provider` | Yes | Remove provider credentials |

### Analytics — `/v1/analytics`

All require auth. Accept `?interval=` query param: `15M`, `1H`, `1D`, `7D`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/analytics/overview` | Aggregate usage stats |
| `GET` | `/v1/analytics/timeseries` | Request volume over time |
| `GET` | `/v1/analytics/latency` | Per-provider/model latency breakdown |
| `GET` | `/v1/analytics/cost` | Daily cost breakdown |
| `GET` | `/v1/analytics/errors` | Error rate data |

## Auth Details

- API keys use `ef_` prefix
- Sessions are cookie-based, validated on every `/v1/*` request (except `/v1/apikey/verify`)
- Users have a `hasCompletedOnboarding` field for first-time setup tracking
- Migrations live in `better-auth_migrations/`

## Project Structure

```
src/
├── index.ts              # Server bootstrap, route mounting, CORS
├── config.ts             # Environment variable definitions
├── layers.ts             # Effect Layer composition (DI wiring)
├── runtime.ts            # Effect ManagedRuntime setup
├── errors.ts             # Tagged error types
├── schemas.ts            # Request validation schemas
├── middleware/
│   └── auth.ts           # Session auth middleware
├── routes/
│   ├── apikey.ts         # API key CRUD endpoints
│   ├── secret.ts         # Provider secret endpoints
│   └── analytics.ts      # Analytics endpoints
└── services/
    ├── auth.ts           # better-auth setup (GitHub OAuth, API key plugin)
    ├── apikey.ts         # API key logic + verification
    └── secret.ts         # Provider credential management via Vault
```
