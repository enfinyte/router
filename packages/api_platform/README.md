# api_platform

HTTP API server for the LLM router. Exposes an OpenAI-compatible [Responses API](https://www.openresponses.org/), routes requests to the best available AI provider using Provider Model Routing (PMR), and persists results to PostgreSQL.

## Tech Stack

- **HTTP**: [@effect/platform](https://effect.website) + Bun adapter
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai) with OpenAI, Anthropic, Amazon Bedrock providers
- **Database**: [Kysely](https://kysely.dev/) + PostgreSQL
- **Validation**: Effect Schema

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- PostgreSQL

## Setup

```bash
# From repo root
bun install

# Start the server
cd packages/api_platform
bun run src/index.ts
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_PLATFORM_PG_CONNECTION` | **Yes** | — | PostgreSQL connection string. Auto-creates database and tables on startup. |
| `API_PLATFORM_PORT` | No | `8080` | HTTP server port |
| `API_PLATFORM_LOG_LEVEL` | No | `INFO` | Log level |
| `API_PLATFORM_BACKEND_URL` | No | `http://localhost:8000` | Backend service URL for API key verification |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | — | Health check |
| `POST` | `/v1/responses` | Bearer | Create an AI response |
| `GET` | `/v1/responses/:id` | Bearer | Retrieve a stored response |

### POST /v1/responses

Accepts the full OpenAI Responses API request body. Key validation rules:

- `model` — required, non-empty
- `input` — required
- `temperature` — 0–2
- `top_p` — 0–1
- `max_output_tokens` — must be positive
- `Content-Type: application/json` enforced by middleware

## Request Flow

```
POST /v1/responses
  → Auth middleware (verifies Bearer token via backend /v1/apikey/verify)
    → Content-Type middleware
      → ResponsesService.create()
        → PMRService.resolve()           # Pick best provider/model
        → CredentialsService.get()        # Fetch user's API keys from Vault
        → generateText()                  # Call the LLM
        → [on failure] retry next PMR candidate
        → [all fail] fallback to Bedrock claude-haiku
      → DatabaseService.persist()         # Store result
  → Return ResponseResource JSON
```

## Services

| Service | Description |
|---------|-------------|
| `AppConfig` | Reads environment variables |
| `DatabaseService` | Kysely/PostgreSQL pool; auto-provisions DB and tables |
| `AIService` | PMR retry loop + `generateText` execution |
| `ResponsesService` | Orchestrates AI execution + persistence |
| `PMRService` | Wraps `resolver` package for model/provider resolution |
| `CredentialsService` | Fetches per-user provider credentials from Vault |
| `RequestContext` | Per-request auth context (userId, userProviders) |

## Scripts

```bash
bun run gen:responses-types   # Regenerate OpenAPI types from openresponses.org spec
```

## Project Structure

```
src/
├── index.ts                    # Entry point, server setup, layer composition
├── middlewares.ts               # Content-type + Bearer token auth middleware
├── routes/
│   ├── index.ts                 # Root router (/health, mounts v1)
│   └── v1/
│       ├── index.ts             # v1 router (mounts /responses)
│       └── responses.ts         # POST + GET /v1/responses handlers
└── services/
    ├── config.ts                # AppConfig (env vars)
    ├── ai/index.ts              # AI execution with PMR retry loop
    ├── credentials.ts           # Provider credential resolution from Vault
    ├── pmr.ts                   # Provider Model Routing wrapper
    ├── request-context.ts       # Per-request auth context
    ├── responses/
    │   ├── schema.ts            # Effect schemas
    │   └── index.ts             # Response orchestration
    └── database/
        ├── index.ts             # DB service + connection pool
        ├── tables.ts            # Table type definitions
        └── responses/
            ├── table.ts         # Table schema
            ├── adapters.ts      # DB ↔ domain adapters
            └── index.ts         # DB operations
```
