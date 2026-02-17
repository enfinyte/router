# vault

[HashiCorp Vault](https://www.vaultproject.io/) integration for securely storing per-user, per-provider API credentials (e.g., a user's OpenAI API key). Provides an Effect-TS `VaultService` and ships a Docker Compose setup for self-hosting.

Secrets are stored in Vault's KV v2 engine at paths like `secret/data/{userId}/{provider}`.

## Tech Stack

- **Client**: [node-vault](https://github.com/nodevault/node-vault)
- **Runtime**: [Effect-TS](https://effect.website) (services, layers, typed errors)
- **Infrastructure**: Docker Compose (Vault + PostgreSQL storage backend)

## Prerequisites

- Docker + Docker Compose (for self-hosted Vault)
- PostgreSQL (Vault storage backend)

## Setup

```bash
# 1. Start Vault
cd packages/vault
VAULT_PG_CONNECTION_URL="postgres://..." docker compose up -d

# 2. Initialize and unseal (first time only)
bun run init.ts
# Outputs: root token + unseal key. Save these.

# 3. On subsequent restarts (if sealed)
VAULT_TOKEN_KEY=<unseal_key> bun run init.ts
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VAULT_ADDR` | No | `http://127.0.0.1:8200` | Vault server URL |
| `VAULT_TOKEN` | **Yes** | — | Vault root/service token |
| `VAULT_TOKEN_KEY` | Conditional | — | Unseal key (only for `init.ts` when Vault is sealed) |
| `VAULT_PG_CONNECTION_URL` | **Yes** (Docker) | — | PostgreSQL URL for Vault's storage backend |

## Service API

`VaultService` provides an Effect-TS service with three operations:

| Method | Description |
|--------|-------------|
| `addSecret(userId, provider, data)` | Store credentials for a user's provider |
| `getSecret(userId, provider)` | Retrieve credentials |
| `deleteSecret(userId, provider)` | Remove credentials |

## Service Layers

| Layer | Description |
|-------|-------------|
| `VaultConfig` | Reads `VAULT_ADDR` + `VAULT_TOKEN` from env |
| `VaultClient` | Wraps `node-vault` HTTP client |
| `VaultKV` | Low-level KV v2 operations with path validation |
| `VaultService` | High-level per-user/provider secret management |

## Project Structure

```
docker-compose.yml           # Runs Vault on :8200 with PostgreSQL storage
docker_vault_config.hcl      # Vault server config (PostgreSQL, TCP, no TLS)
init.ts                      # One-shot: init → unseal → enable KV v2 at secret/
src/
├── index.ts                 # VaultService (Context.Tag) + VaultServiceLive layer
├── kv.ts                    # VaultKV: write/read/delete + path validation
├── client.ts                # VaultClient: node-vault instance
├── config.ts                # VaultConfig: env var reading
└── logger.ts                # VaultLoggerLive
```
