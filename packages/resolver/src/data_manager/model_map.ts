import type { ResolvedResponse } from "common";
import { parseModelId } from "../parser/parse_model_id.ts";
import { modelsMatch } from "../parser/match_models.ts";

export function generateModelMap(
  openRouterSlugs: readonly string[],
  modelsdev: Readonly<Record<string, readonly string[]>>,
): Record<string, ResolvedResponse[]> {
  const map: Record<string, ResolvedResponse[]> = {};

  const parsedProviderModels: Array<{
    provider: string;
    model: string;
    parsed: ReturnType<typeof parseModelId>;
  }> = [];

  for (const [provider, models] of Object.entries(modelsdev)) {
    for (const model of models) {
      parsedProviderModels.push({
        provider,
        model,
        parsed: parseModelId(model, provider),
      });
    }
  }

  for (const slug of openRouterSlugs) {
    const parsedSlug = parseModelId(slug, "openrouter");
    const matches: ResolvedResponse[] = [];

    for (const entry of parsedProviderModels) {
      if (modelsMatch(parsedSlug, entry.parsed)) {
        matches.push({ provider: entry.provider, model: entry.model });
      }
    }

    if (matches.length > 0) {
      map[slug] = matches;
    }
  }

  return map;
}
