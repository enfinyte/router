import type { ParsedBareId } from "../types";
import { SIZE_TIERS, VARIANTS } from "../constants";

/**
 * Parse O-series model names (o1, o3, o4-mini).
 */
export function parseOSeries(rest: string): ParsedBareId {
  const result: ParsedBareId = {
    family: "o",
    generation: "",
  };

  const tokens = rest.split(/[-_]/).filter((t) => t.length > 0);

  if (tokens[0] !== undefined && /^\d+$/.test(tokens[0])) {
    result.generation = tokens[0];
  }

  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i]?.toLowerCase() ?? "";
    if (SIZE_TIERS.has(tok)) {
      result.tier = tok;
    } else if (tok === "preview") {
      result.isPreview = true;
    } else if (VARIANTS.has(tok) || tok === "deep-research") {
      result.variant = result.variant ? `${result.variant}-${tok}` : tok;
    } else if (tok === "deep") {
      const next = tokens[i + 1]?.toLowerCase() ?? "";
      if (next === "research") {
        result.variant = "deep-research";
        i++;
      }
    }
  }

  return result;
}
