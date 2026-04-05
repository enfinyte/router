import type { ParsedBareId, ParsedModelId } from "./types";
import { FAMILY_ROOTS } from "./constants";
import { dotVersionToDash } from "./helpers";
import { stripProviderWrapper } from "./strip";
import { parseClaude } from "./families/claude";
import { parseGptFamily } from "./families/gpt";
import { parseGemini } from "./families/gemini";
import { parseLlama } from "./families/llama";
import { parseOSeries } from "./families/o_series";
import { parseGeneric } from "./families/generic";

export type { ParsedModelId } from "./types";

/**
 * Detect the family root from a bare model ID.
 * Returns the family name and the remaining string after the family prefix.
 */
function detectFamily(bareId: string): { family: string; rest: string } | null {
  const lower = bareId.toLowerCase();

  for (const root of FAMILY_ROOTS) {
    if (root === "o") {
      const m = lower.match(/^o(\d)/);
      if (m) {
        return { family: "o", rest: bareId.slice(1) };
      }
      continue;
    }

    const normalized = dotVersionToDash(lower);
    const rootDashed = dotVersionToDash(root);
    if (
      normalized.startsWith(rootDashed) &&
      (normalized.length === rootDashed.length ||
        normalized[rootDashed.length] === "-" ||
        normalized[rootDashed.length] === "_" ||
        /\d/.test(normalized[rootDashed.length] ?? ""))
    ) {
      let restStart = root.length;
      const origPrefix = bareId.slice(0, rootDashed.length);
      if (dotVersionToDash(origPrefix.toLowerCase()) === rootDashed) {
        restStart = rootDashed.length;
      }

      let rest = bareId.slice(restStart);
      if (rest.startsWith("-") || rest.startsWith("_")) {
        rest = rest.slice(1);
      }
      return { family: root, rest };
    }
  }

  // Fallback: first token is the family
  const firstDelim = bareId.search(/[-_]/);
  if (firstDelim === -1) return { family: bareId.toLowerCase(), rest: "" };
  return {
    family: bareId.slice(0, firstDelim).toLowerCase(),
    rest: bareId.slice(firstDelim + 1),
  };
}

function parseBareId(bareId: string): ParsedBareId {
  const detected = detectFamily(bareId);
  if (!detected) {
    return { family: bareId.toLowerCase(), generation: "" };
  }

  const { family, rest } = detected;

  switch (family) {
    case "claude":
      return parseClaude(rest);

    case "gpt":
    case "gpt-oss":
    case "gpt-oss-safeguard":
      return parseGptFamily(family, rest);

    case "gemini":
      return parseGemini(rest);

    case "meta-llama":
    case "llama":
      return parseLlama(rest);

    case "o":
      return parseOSeries(rest);

    default:
      return parseGeneric(family, rest);
  }
}

export function parseModelId(raw: string, platform: string): ParsedModelId {
  const stripped = stripProviderWrapper(raw, platform);
  const parsed = parseBareId(stripped.bareId);

  return {
    raw,
    platform,

    region: stripped.region,
    vendor: stripped.vendor,
    deploymentVersion: stripped.deploymentVersion,
    routingTag: stripped.routingTag,
    maasSuffix: stripped.maasSuffix,

    family: parsed.family,
    generation: parsed.generation,
    tier: parsed.tier,
    variant: parsed.variant,

    sizeBillions: parsed.sizeBillions,
    activeBillions: parsed.activeBillions,
    date: parsed.date,
    contextK: parsed.contextK,
    quantization: parsed.quantization,

    isOpenSource: parsed.isOpenSource,
    isSafety: parsed.isSafety,
    isPreview: parsed.isPreview,
  };
}
