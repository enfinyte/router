import type { ParsedBareId } from "../types";
import { SIZE_TIERS, VARIANTS } from "../constants";
import { extractDate8 } from "../helpers";

/**
 * Generic parser for model families that follow a straightforward pattern:
 * {FAMILY}-{GEN}[-{TIER}][-{SIZE}b][-{VARIANT}][-{DATE}]
 *
 * Used for: grok, glm, phi, mistral, deepseek, qwen, jamba, nova, etc.
 */
export function parseGeneric(family: string, rest: string): ParsedBareId {
  const result: ParsedBareId = {
    family,
    generation: "",
  };

  let working = rest;

  const d8 = extractDate8(working);
  if (d8) {
    result.date = d8.date;
    working = d8.rest;
  }

  // Extract 4-digit date (YYMM) — only if no 8-digit date found
  const d4Match = working.match(/(?:^|-)(\d{4})(?:$|-)/);
  if (d4Match && !result.date && d4Match[1] !== undefined) {
    const val = parseInt(d4Match[1]);
    if (val > 2000 && val < 2600) {
      result.date = d4Match[1];
      const idx = d4Match.index ?? 0;
      const prefix = idx > 0 ? working.slice(0, idx) : "";
      const suffix = working.slice(idx + d4Match[0].length);
      working = [prefix, suffix].filter(Boolean).join("-").replace(/^-|-$/g, "");
    }
  }

  // Extract parameter size: NNb
  const sizeMatch = working.match(/(?:^|-)(\d+)b(?:$|-)/i);
  if (sizeMatch && sizeMatch[1] !== undefined) {
    result.sizeBillions = parseInt(sizeMatch[1]);
    working = working.replace(new RegExp(`-?${sizeMatch[1]}b-?`, "i"), "-").replace(/^-|-$/g, "");
  }

  // Extract active params for MoE: aNNb
  const activeMatch = working.match(/(?:^|-)a(\d+)b(?:$|-)/i);
  if (activeMatch && activeMatch[1] !== undefined) {
    result.activeBillions = parseInt(activeMatch[1]);
    working = working
      .replace(new RegExp(`-?a${activeMatch[1]}b-?`, "i"), "-")
      .replace(/^-|-$/g, "");
  }

  // Extract context: NNk
  const ctxMatch = working.match(/(?:^|-)(\d+)k(?:$|-)/i);
  if (ctxMatch && ctxMatch[1] !== undefined) {
    result.contextK = parseInt(ctxMatch[1]);
    working = working.replace(new RegExp(`-?${ctxMatch[1]}k-?`, "i"), "-").replace(/^-|-$/g, "");
  }

  // Extract quantization: fpNN
  const quantMatch = working.match(/(?:^|-)fp(\d+)(?:$|-)/i);
  if (quantMatch && quantMatch[1] !== undefined) {
    result.quantization = `fp${quantMatch[1]}`;
    working = working.replace(new RegExp(`-?fp${quantMatch[1]}-?`, "i"), "-").replace(/^-|-$/g, "");
  }

  // Strip version suffix: -vN
  working = working.replace(/-v\d+$/, "");

  const tokens = working.split(/[-_]/).filter((t) => t.length > 0);

  // First token: generation
  let i = 0;
  if (tokens[0] !== undefined && /^\d/.test(tokens[0])) {
    result.generation = tokens[0];
    i = 1;

    const minorTok = tokens[i];
    if (minorTok !== undefined && /^\d+$/.test(minorTok) && parseInt(minorTok) < 10) {
      result.generation = `${result.generation}.${minorTok}`;
      i++;
    }
  } else if (tokens[0] !== undefined && /^[vmrk]\d[\d.]*$/i.test(tokens[0])) {
    result.generation = tokens[0].toLowerCase();
    i = 1;
  }

  // Remaining tokens: classify as tier, variant, or skip
  for (; i < tokens.length; i++) {
    const tok = tokens[i]?.toLowerCase() ?? "";

    if (SIZE_TIERS.has(tok)) {
      if (result.tier === undefined) {
        result.tier = tok;
      }
    } else if (VARIANTS.has(tok)) {
      result.variant = result.variant ? `${result.variant}-${tok}` : tok;
    } else if (tok === "preview") {
      result.isPreview = true;
    } else if (tok === "latest" || tok === "default" || tok === "text") {
      // skip metadata
    } else if (tok === "safeguard" || tok === "safety") {
      result.isSafety = true;
    } else if (tok === "oss") {
      result.isOpenSource = true;
    } else if (tok === "plus") {
      if (result.variant) {
        result.variant = `${result.variant}-plus`;
      } else if (result.tier) {
        result.tier = `${result.tier}-plus`;
      }
    } else if (tok === "next") {
      result.variant = result.variant ? `${result.variant}-next` : "next";
    } else if (tok === "light") {
      result.tier = "light";
    } else if (/^\d[\d.]*$/.test(tok) && result.generation === "") {
      result.generation = tok;
    }
  }

  return result;
}
