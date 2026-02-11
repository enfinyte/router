I need to create a new file `data_manager/category_model_map.ts` that maps OpenRouter
model slugs to provider/model pairs, similar to the existing `data_manager/model_map.ts`.
## Data sources
1. **Model slugs**: Collected from all JSON files in `__data/<category>/<policy>.json`
   (e.g., `__data/seo/most-popular.json`). Each file contains an array of OpenRouter
   model slugs like `"anthropic/claude-sonnet-4.5"`. Collect ALL unique slugs across
   all categories and policies.
2. **Provider model lists**: `__data/modelsdev.json` maps each provider to an array
   of model identifiers they support. Only use providers present in this file
   (amazon-bedrock, anthropic, azure, google-vertex-anthropic, google-vertex, openai).
## Task
For each unique model slug from (1), find ALL matching model entries across ALL
providers in (2) using heuristic name matching. Matching patterns include:
- Exact names (e.g., `gpt-5.2` in openai/azure)
- Dot-to-dash version transforms (e.g., `claude-sonnet-4.5` → `claude-sonnet-4-5`)
- Dated variants (e.g., `claude-sonnet-4-5-20250929`)
- Provider-prefixed on Bedrock (e.g., `anthropic.claude-*`, `openai.gpt-*`)
- Regional prefixes on Bedrock (e.g., `us.`, `eu.`, `global.`)
- Vertex Anthropic @ format (e.g., `claude-sonnet-4-5@20250929`)
- MaaS suffixed on google-vertex (e.g., `openai/gpt-oss-120b-maas`)
- Azure naming variants (e.g., `deepseek-chat-v3-0324` → `deepseek-v3-0324`)
## Output rules
- Export `CategoryProviderModelMap: Record<string, ResolvedResponse[]>`
  (import `ResolvedResponse` from `"../types"`)
- Include ALL models that have at least one provider match; skip models with zero matches
- Include ALL matching provider/model pairs per slug (be exhaustive — check every
  provider's full list)
- This is a self-contained file — include models even if they overlap with model_map.ts
- Re-export from `data_manager/index.ts`
## Uncertain matches
When a match is ambiguous (e.g., version mismatch, "coder" variant, "speciale" suffix),
include it. Prefer false positives over missed matches. Flag any uncertain mappings
with a code comment so I can review.
## Verification
- Run `bunx tsc --noEmit` after to confirm no type errors from the new file
- List any skipped models (zero matches) in a JSDoc comment at the top of the file
