import type { ParsedBareId } from "../types";
import { extractDate8 } from "../helpers";

/**
 * Parse Gemini model names.
 * Format: gemini-{GEN}-{TIER}[-{VARIANT}][-{DATE}]
 * Tiers: flash, flash-lite, pro, embedding
 */
export function parseGemini(rest: string): ParsedBareId {
  const result: ParsedBareId = {
    family: "gemini",
    generation: "",
  };

  let working = rest;

  const d8 = extractDate8(working);
  if (d8) {
    result.date = d8.date;
    working = d8.rest;
  }

  working = working.replace(/-latest$/, "");

  const previewDateMatch = working.match(/-(preview)(?:-(\d{2})-(\d{2,4}))?$/);
  if (previewDateMatch) {
    result.isPreview = true;
    working = working.slice(0, working.length - previewDateMatch[0].length);
  }

  const tokens = working.split(/[-_]/).filter((t) => t.length > 0);

  if (tokens.length > 0 && tokens[0] !== undefined && /^\d/.test(tokens[0])) {
    result.generation = tokens[0];

    const remaining = tokens.slice(1);
    const tierParts: string[] = [];
    for (const tok of remaining) {
      const lower = tok.toLowerCase();
      if (lower === "flash" || lower === "lite" || lower === "pro" || lower === "embedding") {
        tierParts.push(lower);
      } else if (lower === "001") {
        // Version suffix, ignore
      }
    }

    if (tierParts.length > 0) {
      result.tier = tierParts.join("-");
    }
  } else {
    if (tokens.length > 0) {
      const tierParts: string[] = [];
      for (const tok of tokens) {
        const lower = tok.toLowerCase();
        if (lower === "flash" || lower === "lite" || lower === "pro") {
          tierParts.push(lower);
        }
      }
      if (tierParts.length > 0) {
        result.tier = tierParts.join("-");
      }
    }
  }

  return result;
}
