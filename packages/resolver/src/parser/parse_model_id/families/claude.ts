import type { ParsedBareId } from "../types";
import { CLAUDE_TIERS } from "../constants";
import { extractDate8 } from "../helpers";

/**
 * Parse Claude-specific model names, handling the gen3/gen4+ naming inversion.
 *
 * Gen 3 scheme: claude-{GEN}-{TIER}-{DATE}-{API_VER}
 *   e.g. "3-5-sonnet-20240620"
 *
 * Gen 4+ scheme: claude-{TIER}-{GEN}-{DATE}-{API_VER}
 *   e.g. "sonnet-4-5-20250929"
 */
export function parseClaude(rest: string): ParsedBareId {
  const result: ParsedBareId = {
    family: "claude",
    generation: "",
  };

  let working = rest;
  const dateResult = extractDate8(working);
  if (dateResult) {
    result.date = dateResult.date;
    working = dateResult.rest;
  }

  const tokens = working.split(/[-_]/).filter((t) => t.length > 0);
  const firstToken = tokens[0]?.toLowerCase() ?? "";

  if (CLAUDE_TIERS.has(firstToken)) {
    // Gen 4+ scheme: {TIER}-{GEN_MAJOR}[-{GEN_MINOR}]-...
    result.tier = firstToken;

    const genParts: string[] = [];
    let i = 1;
    while (i < tokens.length && /^\d[\d.]*$/.test(tokens[i] ?? "")) {
      genParts.push(tokens[i]!);
      i++;
    }

    if (genParts.length > 0) {
      result.generation = genParts.join(".");
    }

    for (; i < tokens.length; i++) {
      const tok = tokens[i]?.toLowerCase() ?? "";
      if (tok === "latest" || tok === "default") {
        // skip — these are aliases
      }
    }
  } else if (/^\d+$/.test(firstToken)) {
    // Gen 3 scheme: {GEN_MAJOR}[-{GEN_MINOR}]-{TIER}-...
    const genParts: string[] = [firstToken];
    let i = 1;
    while (i < tokens.length && /^\d+$/.test(tokens[i] ?? "")) {
      genParts.push(tokens[i]!);
      i++;
    }
    result.generation = genParts.join(".");

    if (i < tokens.length && CLAUDE_TIERS.has(tokens[i]?.toLowerCase() ?? "")) {
      result.tier = tokens[i]!.toLowerCase();
      i++;
    }

    for (; i < tokens.length; i++) {
      const tok = tokens[i]?.toLowerCase() ?? "";
      if (tok === "latest" || tok === "default") {
        // skip
      }
    }
  } else {
    // Legacy: "instant", "v2", etc.
    if (firstToken === "instant") {
      result.tier = "instant";
      result.generation = "1";
    } else if (firstToken.startsWith("v")) {
      result.generation = firstToken.slice(1);
    }
  }

  return result;
}
