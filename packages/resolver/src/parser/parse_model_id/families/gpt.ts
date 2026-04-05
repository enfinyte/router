import type { ParsedBareId } from "../types";
import { SIZE_TIERS, VARIANTS } from "../constants";
import { extractDate8, extractDateISO } from "../helpers";

/**
 * Parse a GPT-family model name.
 * Handles: gpt-{GEN}[-{TIER}][-{DATE}], gpt-oss-{SIZE}b, gpt-oss-safeguard-{SIZE}b
 */
export function parseGptFamily(family: string, rest: string): ParsedBareId {
  const result: ParsedBareId = {
    family,
    generation: "",
  };

  if (family === "gpt-oss-safeguard") {
    result.isOpenSource = true;
    result.isSafety = true;
  } else if (family === "gpt-oss") {
    result.isOpenSource = true;
  }

  let working = rest;

  const isoDate = extractDateISO(working);
  if (isoDate) {
    result.date = isoDate.date;
    working = isoDate.rest;
  }

  if (!result.date) {
    const d8 = extractDate8(working);
    if (d8) {
      result.date = d8.date;
      working = d8.rest;
    }
  }

  const sizeMatch = working.match(/(\d+)b(?:\b|$|-)/i);
  if (sizeMatch && sizeMatch[1] !== undefined) {
    result.sizeBillions = parseInt(sizeMatch[1]);
    working = working.replace(sizeMatch[0], sizeMatch[0].endsWith("-") ? "" : "");
    working = working.replace(/^-|-$/g, "");
  }

  if (family === "gpt-oss" || family === "gpt-oss-safeguard") {
    working = working.replace(/-\d+$/, "");
    return result;
  }

  const tokens = working.split(/[-_]/).filter((t) => t.length > 0);

  if (tokens.length > 0 && tokens[0] !== undefined) {
    const genToken = tokens[0];
    if (/^\d/.test(genToken)) {
      result.generation = genToken;

      for (let i = 1; i < tokens.length; i++) {
        const tok = tokens[i]?.toLowerCase() ?? "";
        if (SIZE_TIERS.has(tok)) {
          if (result.tier === undefined) {
            result.tier = tok;
          } else {
            if (result.variant === undefined && !SIZE_TIERS.has(result.tier)) {
              result.variant = result.tier;
              result.tier = tok;
            }
          }
        } else if (VARIANTS.has(tok)) {
          result.variant = result.variant ? `${result.variant}-${tok}` : tok;
        } else if (tok === "latest") {
          // skip
        } else if (tok === "spark") {
          result.variant = result.variant ? `${result.variant}-${tok}` : tok;
        } else if (tok === "plus") {
          result.variant = result.variant ? `${result.variant}-plus` : "plus";
        }
      }
    }
  }

  if (result.tier === "codex" || result.tier === "chat") {
    result.variant = result.tier;
    result.tier = undefined;
  }

  if (result.variant === "codex" && tokens.length > 2) {
    const lastTok = tokens[tokens.length - 1]?.toLowerCase() ?? "";
    if (SIZE_TIERS.has(lastTok) && lastTok !== "codex") {
      result.tier = lastTok;
    }
  }

  return result;
}
