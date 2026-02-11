# Router

An LLM routing platform that routes requests to the optimal LLM and provider, built on the [OpenResponses API](https://www.openresponses.org/) spec.

This is a Bun monorepo implementing an LLM router API. It uses Effect-TS for typed functional programming, supports multiple AI providers (OpenAI, Anthropic, Amazon Bedrock), and includes a web dashboard with authentication.

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) (v1.0+)
- [PostgreSQL](https://www.postgresql.org/)

### Setup
1. Install dependencies:
   ```bash
   bun install
   ```

2. Environment variables (core API):
   Configure these in your environment or a `.env` file in `packages/api_platform`:
   ```bash
   API_PLATFORM_PG_CONNECTION=postgres://...  # Required
   API_PLATFORM_PORT=8080                      # Optional, default: 8080
   API_PLATFORM_LOG_LEVEL=INFO                 # Optional, default: INFO
   ```

3. Run the services:
   - **API Platform**: `bun run packages/api_platform/src/index.ts`
   - **Type check**: `bunx tsc --noEmit`
   - **Lint**: `bunx oxlint .`
   - **Format**: `bunx oxfmt .`

### Full Stack Setup
- **Backend**: `bun run packages/backend/src/index.ts`
  *(Requires `POSTGRES_CONNECTION_STRING`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)*
- **Frontend**: `bun run --cwd packages/frontend dev`
  *(Runs on port 3000)*
- **Vault**: `docker compose -f packages/vault/docker-compose.yml up`
  *(Requires `VAULT_TOKEN_KEY`)*

## Packages

| Package | Description |
|---------|-------------|
| `api_platform` | HTTP API server — the main LLM routing service. Built with @effect/platform, Kysely (Postgres), and Vercel AI SDK. |
| `backend` | Auth and dashboard backend. Built with Hono and better-auth (GitHub OAuth). |
| `common` | Shared utilities and OpenAI type definitions. |
| `core` | Core routing logic. |
| `frontend` | Web dashboard UI. Built with SolidJS, Tailwind CSS, and Vite. |
| `resolver` | Model resolution logic — determines which provider/model to route to. |
| `vault` | HashiCorp Vault integration for secrets management. |

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Core framework**: [Effect-TS](https://effect.website)
- **AI providers**: [Vercel AI SDK](https://sdk.vercel.ai) with OpenAI, Anthropic, Amazon Bedrock
- **API spec**: [OpenResponses API](https://www.openresponses.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) via [Kysely](https://kysely.dev/)
- **Auth**: [better-auth](https://www.better-auth.com/) with GitHub OAuth
- **Frontend**: [SolidJS](https://www.solidjs.com/) + [Tailwind CSS](https://tailwindcss.com/) + [Vite](https://vitejs.dev/)
- **Backend**: [Hono](https://hono.dev/)
- **Secrets**: [HashiCorp Vault](https://www.vaultproject.io/)
- **Linting**: [oxlint](https://oxc.rs/docs/guide/usage/linter.html)
- **Formatting**: [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html)

## Contributing

See [AGENTS.md](./AGENTS.md) for detailed code style guidelines, architecture patterns, and development conventions.

### Key Conventions
- Use Effect-TS patterns (`Effect.gen`, `Data.TaggedError`, `Context.Tag`)
- Named exports only, no default exports
- `type` keyword for type-only imports
- Use `oxlint` for linting and `oxfmt` for formatting

### Dev Commands
```bash
bun install              # Install dependencies
bunx tsc --noEmit        # Type check
bunx oxlint .            # Lint
bunx oxfmt .             # Format
```
