# common

Shared type and schema library for the monorepo. Defines the canonical data contracts — request bodies, response resources, streaming events, and provider credentials — used by every other package. All schemas are built with [Effect Schema](https://effect.website), providing both runtime validation and static TypeScript types from a single source.

This is a **private workspace package** — not published to npm, consumed directly as TypeScript source via Bun's workspace resolution.

## Modules

### `providers.ts` — Provider Registry

| Export | Kind | Description |
|--------|------|-------------|
| `Providers` | enum | `"amazon-bedrock"`, `"openai"`, `"anthropic"` |
| `SUPPORTED_PROVIDERS` | const | Array of all provider strings |
| `ProviderCredentialsMap` | type | Maps each provider to its required credential shape |
| `ProviderCredentials<T>` | type | Credential type for a specific provider |

### `resolver.ts` — Resolved Model Contract

| Export | Kind | Description |
|--------|------|-------------|
| `ResolvedResponseSchema` | Schema | `{ model: string, provider: string }` |
| `ResolvedResponse` | type | What the resolver returns after picking a model |

### `schema.ts` — OpenAI-Compatible API Schemas

Full [OpenResponses API](https://www.openresponses.org/) surface including:

- **Request**: `CreateResponseBodySchema` / `CreateResponseBody` — complete request body with model, input, tools, temperature, reasoning, etc.
- **Response**: `ResponseResourceSchema` / `ResponseResource` — full response object with id, status, output, usage, model
- **Messages**: `MessageSchema`, `FunctionCallSchema`, `FunctionCallOutputSchema`, `ReasoningBodySchema`
- **Input types**: text, image, file, video, item references, function calls
- **Tool types**: function tool definitions, tool choice parameters
- **Format types**: text, JSON schema, JSON object response formats
- **Streaming**: 23 event types (`StreamingEventSchema` / `StreamingEvent`) covering response lifecycle, text deltas, reasoning, function call args, errors

## Consumers

| Package | What it uses |
|---------|--------------|
| `api_platform` | Request/response schemas, provider types, message types |
| `resolver` | `CreateResponseBody`, `ResolvedResponse`, `SUPPORTED_PROVIDERS` |
| `backend` | `SUPPORTED_PROVIDERS` |

## Dependencies

- `openai` — for AI SDK provider settings types
- `effect` (peer) — Effect Schema runtime

No build step. No scripts. Consumed as source.
