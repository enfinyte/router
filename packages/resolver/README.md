# resolver

Intelligent LLM model selection library. Given a request's `model` field, resolves it to a concrete `{ provider, model }` pair. Supports three resolution modes depending on the input format.

This is a **library package** — no standalone server. Consumed by [`api_platform`](../api_platform) via workspace dependency.

## Resolution Modes

### 1. Direct — `provider/model`

```
openai/gpt-4o  →  { provider: "openai", model: "gpt-4o" }
```

Parses the `provider/model` string directly. Validates against known providers and models.

### 2. Intent — `auto::policy::category`

```
auto::most-popular::programming  →  looks up ranked model list  →  { provider, model }
```

Uses a local data cache (fetched from OpenRouter + models.dev) to find the best model for the given intent policy and category.

**Policies**: `most-popular`, `cheapest`, `fastest`, `newest`, `best-benchmark`

**Categories**: `programming`, `marketing`, `roleplay`, etc.

### 3. Auto — `auto` or `auto::auto`

```
auto  →  LLM classifies intent  →  falls back to Intent mode
```

Calls Amazon Bedrock (`moonshotai.kimi-k2.5`) to classify the request's content into a category and policy, then resolves via Intent mode.

## Data Cache

Model rankings are fetched from:
- `https://openrouter.ai/api/frontend/models` (per category x sort order)
- `https://models.dev/api.json`

Cached to `__data/` on disk with a **12-hour TTL**. No external database required.

## Dependencies

| Package | Role |
|---------|------|
| `ai` + `@ai-sdk/amazon-bedrock` | LLM auto-classification via Bedrock |
| `openai` | OpenAI SDK (direct resolution path) |
| `@effect/platform` + `@effect/platform-bun` | Filesystem access for cache |
| `common` (workspace) | `CreateResponseBody`, `ResolvedResponse`, `SUPPORTED_PROVIDERS` |

## Environment Variables

Auto mode implicitly requires AWS credentials in the environment:

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key for Bedrock |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for Bedrock |
| `AWS_REGION` | AWS region for Bedrock |

## Project Structure

```
src/
├── index.ts                         # Public API: resolve()
├── types.ts                         # Intent, IntentPolicy, error classes
├── logger.ts                        # ResolverLoggerLive
├── resolver/
│   ├── index.ts                     # Dispatch: auto vs direct
│   ├── resolve_auto.ts              # LLM classification via Bedrock
│   ├── resolve_intent.ts            # Intent+policy → ranked model lookup
│   ├── resolve_provider_model.ts    # Direct provider/model validation
│   └── prompts.ts                   # System prompts for classification
├── parser/
│   ├── index.ts                     # Parse model string dispatcher
│   ├── parse_intent.ts              # Parse "auto::policy::category"
│   ├── parse_model_id.ts            # Parse model IDs
│   ├── parse_provider_model.ts      # Parse "provider/model"
│   └── match_models.ts              # Match against available models
└── data_manager/
    ├── fetch.ts                     # Fetch + cache (OpenRouter + models.dev, 12h TTL)
    ├── accessor.ts                  # Read cached data from disk
    ├── model_map.ts                 # Build provider→model lookup map
    ├── const.ts                     # Data file paths
    └── schema/
        ├── modelsdev.ts             # Effect Schema for models.dev API
        └── openrouter.ts            # Effect Schema for OpenRouter API
__data/                              # Runtime cache (gitignored)
```
