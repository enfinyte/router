export interface ParsedModelId {
  readonly raw: string;

  /** The platform/provider the model ID originates from. */
  readonly platform: string;

  /** Bedrock region prefix: "us" | "eu" | "global". */
  readonly region?: string | undefined;

  /** The upstream vendor extracted from provider-prefixed IDs. */
  readonly vendor?: string | undefined;

  /** Bedrock deployment version suffix, e.g. "v1:0". */
  readonly deploymentVersion?: string | undefined;

  /** Vertex-Anthropic routing tag, e.g. "20250514" or "default". */
  readonly routingTag?: string | undefined;

  /** Whether the "-maas" suffix was present (Google Vertex). */
  readonly maasSuffix?: boolean | undefined;

  // -- Core matching features (the canonical identity) ----------------------

  /** Model family root: "claude", "gpt", "gemini", "llama", "grok", "glm", etc. */
  readonly family: string;

  /**
   * Normalized generation string using dots: "4.5", "3.7", "2.0", "4o".
   * Empty string when no generation is detected.
   */
  readonly generation: string;

  /** Size/quality tier: "opus", "sonnet", "haiku", "mini", "nano", "flash", "pro", etc. */
  readonly tier?: string | undefined;

  /**
   * Capability/mode variant: "codex", "chat", "coder", "fast", "instruct",
   * "thinking", "reasoning", "vision", "vl", etc.
   */
  readonly variant?: string | undefined;

  // -- Secondary features ---------------------------------------------------

  /** Total parameter count in billions. */
  readonly sizeBillions?: number | undefined;

  /** MoE active parameter count in billions. */
  readonly activeBillions?: number | undefined;

  /** Release/snapshot date normalized to "YYYYMMDD". */
  readonly date?: string | undefined;

  /** Context window in thousands (e.g. 128 for 128k). */
  readonly contextK?: number | undefined;

  /** Quantization format, e.g. "fp8", "fp16". */
  readonly quantization?: string | undefined;

  // -- Flags ----------------------------------------------------------------

  /** Model marketed as open-source/open-weight (e.g. gpt-oss). */
  readonly isOpenSource?: boolean | undefined;

  /** Safety/guard/safeguard model. */
  readonly isSafety?: boolean | undefined;

  /** Explicitly a preview release. */
  readonly isPreview?: boolean | undefined;
}

const REGIONS = new Set(["us", "eu", "ap", "global"]);

const CLAUDE_TIERS = new Set(["opus", "sonnet", "haiku", "instant"]);

const SIZE_TIERS = new Set([
  // Quality tiers (Claude)
  "opus",
  "sonnet",
  "haiku",
  "instant",
  // Size tiers (GPT, Phi, Mistral, etc.)
  "nano",
  "micro",
  "mini",
  "small",
  "medium",
  "large",
  // Speed/cost tiers (Gemini, Amazon Nova)
  "lite",
  "flash",
  "express",
  "turbo",
  // Premium tiers
  "pro",
  "premier",
  "max",
]);

const VARIANTS = new Set([
  "instruct",
  "chat",
  "codex",
  "coder",
  "code",
  "vision",
  "vl",
  "multimodal",
  "thinking",
  "reasoning",
  "fast",
  "it", // Google's "instruction-tuned" abbreviation
  "moe",
  "deep-research",
]);

const FAMILY_ROOTS = [
  "gpt-oss-safeguard",
  "gpt-oss",
  "gpt",
  "claude",
  "gemini",
  "gemma",
  "meta-llama",
  "llama",
  "grok-code",
  "grok",
  "glm",
  "phi",
  "mistral",
  "mixtral",
  "ministral",
  "voxtral",
  "codestral",
  "deepseek",
  "command-r-plus",
  "command-r",
  "command",
  "jamba",
  "titan",
  "nova",
  "nemotron",
  "palmyra",
  "minimax",
  "kimi",
  "qwen",
  "lfm",
  "step",
  "trinity",
  "pony",
  "o", // OpenAI o-series (o1, o3, o4-mini) — must be last, very short
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dotVersionToDash(s: string): string {
  return s.replace(/(\d+)\.(\d+)/g, "$1-$2");
}

function extractDate8(s: string): { date: string; rest: string } | null {
  const m = s.match(/(^|[-_])(\d{8})($|[-_])/);
  if (!m || m[2] === undefined) return null;
  const year = parseInt(m[2].slice(0, 4));
  // Sanity check: year between 2020 and 2030
  if (year < 2020 || year > 2030) return null;
  const start = (m.index ?? 0) + (m[1]?.length ?? 0);
  const end = start + 8;
  const rest = s.slice(0, start > 0 ? start - 1 : start) + s.slice(end);
  return { date: m[2], rest: rest.replace(/^-|-$/g, "") };
}

function extractDateISO(s: string): { date: string; rest: string } | null {
  const m = s.match(/(^|[-_])(\d{4})-(\d{2})-(\d{2})($|[-_])/);
  if (!m || m[2] === undefined || m[3] === undefined || m[4] === undefined) return null;
  const year = parseInt(m[2]);
  if (year < 2020 || year > 2030) return null;
  const date = `${m[2]}${m[3]}${m[4]}`;
  const full = `${m[2]}-${m[3]}-${m[4]}`;
  const start = (m.index ?? 0) + (m[1]?.length ?? 0);
  const end = start + full.length;
  const rest = s.slice(0, start > 0 ? start - 1 : start) + s.slice(end);
  return { date, rest: rest.replace(/^-|-$/g, "") };
}

interface StrippedResult {
  bareId: string;
  region?: string | undefined;
  vendor?: string | undefined;
  deploymentVersion?: string | undefined;
  routingTag?: string | undefined;
  maasSuffix?: boolean | undefined;
}

function stripBedrock(raw: string): StrippedResult {
  let id = raw;
  let region: string | undefined;
  let vendor: string | undefined;
  let deploymentVersion: string | undefined;

  // Strip deployment version (:N or :N:Nk)
  const dvMatch = id.match(/:(\d[\w:]*?)$/);
  if (dvMatch && dvMatch[1] !== undefined) {
    deploymentVersion = dvMatch[1];
    id = id.slice(0, id.length - dvMatch[0].length);
  }

  // Split on "." to get [region?, vendor, ...model parts]
  const dotParts = id.split(".");
  if (dotParts.length >= 2) {
    let startIdx = 0;

    // Check for region prefix
    if (dotParts[0] !== undefined && REGIONS.has(dotParts[0])) {
      region = dotParts[0];
      startIdx = 1;
    }

    // Vendor is next segment
    vendor = dotParts[startIdx];

    // Remaining segments are the model name (re-join with ".")
    id = dotParts.slice(startIdx + 1).join(".");
  }

  // Strip the Bedrock API version suffix: -v1, -v2 (without colon — some have it stripped already)
  const apiVerMatch = id.match(/-v(\d+)$/);
  if (apiVerMatch) {
    if (deploymentVersion === undefined) {
      deploymentVersion = `v${apiVerMatch[1]}`;
    }
    id = id.slice(0, id.length - apiVerMatch[0].length);
  }

  return { bareId: id, region, vendor, deploymentVersion };
}

function stripVertexAnthropic(raw: string): StrippedResult {
  const atIdx = raw.indexOf("@");
  if (atIdx === -1) return { bareId: raw };

  const bareId = raw.slice(0, atIdx);
  const routingTag = raw.slice(atIdx + 1);
  return { bareId, routingTag };
}

function stripVertex(raw: string): StrippedResult {
  let id = raw;
  let vendor: string | undefined;
  let maasSuffix: boolean | undefined;

  // Third-party models: "org/model-maas"
  const slashIdx = id.indexOf("/");
  if (slashIdx !== -1) {
    vendor = id.slice(0, slashIdx);
    id = id.slice(slashIdx + 1);
  }

  // Strip -maas suffix
  if (id.endsWith("-maas")) {
    maasSuffix = true;
    id = id.slice(0, -5);
  }

  return { bareId: id, vendor, maasSuffix };
}

function stripOpenRouterSlug(raw: string): StrippedResult {
  const slashIdx = raw.indexOf("/");
  if (slashIdx === -1) return { bareId: raw };

  const vendor = raw.slice(0, slashIdx);
  const bareId = raw.slice(slashIdx + 1);
  return { bareId, vendor };
}

function stripMinimal(raw: string): StrippedResult {
  return { bareId: raw };
}

function stripProviderWrapper(raw: string, platform: string): StrippedResult {
  switch (platform) {
    case "amazon-bedrock":
      return stripBedrock(raw);
    case "google-vertex-anthropic":
      return stripVertexAnthropic(raw);
    case "google-vertex":
      return stripVertex(raw);
    case "openrouter":
      return stripOpenRouterSlug(raw);
    case "anthropic":
    case "azure":
    case "openai":
    default:
      return stripMinimal(raw);
  }
}

// ---------------------------------------------------------------------------
// Phase 2: Parse bare model name into canonical features
// ---------------------------------------------------------------------------

interface ParsedBareId {
  family: string;
  generation: string;
  tier?: string | undefined;
  variant?: string | undefined;
  sizeBillions?: number | undefined;
  activeBillions?: number | undefined;
  date?: string | undefined;
  contextK?: number | undefined;
  quantization?: string | undefined;
  isOpenSource?: boolean | undefined;
  isSafety?: boolean | undefined;
  isPreview?: boolean | undefined;
}

/**
 * Detect the family root from a bare model ID.
 * Returns the family name and the remaining string after the family prefix.
 */
function detectFamily(bareId: string): { family: string; rest: string } | null {
  const lower = bareId.toLowerCase();

  for (const root of FAMILY_ROOTS) {
    // For single-character roots like "o", require it to be followed by a digit
    if (root === "o") {
      const m = lower.match(/^o(\d)/);
      if (m) {
        return { family: "o", rest: bareId.slice(1) };
      }
      continue;
    }

    // Check if the bareId starts with this root followed by a delimiter or digit or end
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
      // If the actual bareId uses dashes where root uses dashes, consume correctly
      // We need to match in the original string (may have dots)
      const origPrefix = bareId.slice(0, rootDashed.length);
      if (dotVersionToDash(origPrefix.toLowerCase()) === rootDashed) {
        restStart = rootDashed.length;
      }

      let rest = bareId.slice(restStart);
      // Strip leading delimiter
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

/**
 * Parse Claude-specific model names, handling the gen3/gen4+ naming inversion.
 *
 * Gen 3 scheme: claude-{GEN}-{TIER}-{DATE}-{API_VER}
 *   e.g. "3-5-sonnet-20240620"
 *
 * Gen 4+ scheme: claude-{TIER}-{GEN}-{DATE}-{API_VER}
 *   e.g. "sonnet-4-5-20250929"
 */
function parseClaude(rest: string): ParsedBareId {
  const result: ParsedBareId = {
    family: "claude",
    generation: "",
  };

  // Remove the rest's date first so it doesn't interfere with generation parsing
  let working = rest;
  const dateResult = extractDate8(working);
  if (dateResult) {
    result.date = dateResult.date;
    working = dateResult.rest;
  }

  // Split into tokens
  const tokens = working.split(/[-_]/).filter((t) => t.length > 0);

  // Determine naming scheme: if first token is a known tier, it's gen4+ scheme
  const firstToken = tokens[0]?.toLowerCase() ?? "";

  if (CLAUDE_TIERS.has(firstToken)) {
    // Gen 4+ scheme: {TIER}-{GEN_MAJOR}[-{GEN_MINOR}]-...
    result.tier = firstToken;

    // Collect generation digits (may include dot-versions like "4.5")
    const genParts: string[] = [];
    let i = 1;
    while (i < tokens.length && /^\d[\d.]*$/.test(tokens[i] ?? "")) {
      genParts.push(tokens[i]!);
      i++;
    }

    if (genParts.length > 0) {
      result.generation = genParts.join(".");
    }

    // Check for "latest" or "default" in remaining tokens
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

    // Next token should be the tier
    if (i < tokens.length && CLAUDE_TIERS.has(tokens[i]?.toLowerCase() ?? "")) {
      result.tier = tokens[i]!.toLowerCase();
      i++;
    }

    // Remaining tokens: check for "latest"
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

/**
 * Parse a GPT-family model name.
 * Handles: gpt-{GEN}[-{TIER}][-{DATE}], gpt-oss-{SIZE}b, gpt-oss-safeguard-{SIZE}b
 */
function parseGptFamily(family: string, rest: string): ParsedBareId {
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

  // Extract ISO date (OpenAI uses YYYY-MM-DD)
  const isoDate = extractDateISO(working);
  if (isoDate) {
    result.date = isoDate.date;
    working = isoDate.rest;
  }

  // Extract 8-digit date
  if (!result.date) {
    const d8 = extractDate8(working);
    if (d8) {
      result.date = d8.date;
      working = d8.rest;
    }
  }

  // Extract parameter size (NNb or NNNb)
  const sizeMatch = working.match(/(\d+)b(?:\b|$|-)/i);
  if (sizeMatch && sizeMatch[1] !== undefined) {
    result.sizeBillions = parseInt(sizeMatch[1]);
    working = working.replace(sizeMatch[0], sizeMatch[0].endsWith("-") ? "" : "");
    working = working.replace(/^-|-$/g, "");
  }

  // For gpt-oss variants, the generation comes from the parent "gpt" family
  // but the rest after stripping the family is the size, not a generation
  if (family === "gpt-oss" || family === "gpt-oss-safeguard") {
    // No generation for oss models — the size IS the distinguishing feature
    // But strip trailing deployment version like "-1" on Bedrock (e.g., gpt-oss-20b-1)
    working = working.replace(/-\d+$/, "");
    return result;
  }

  const tokens = working.split(/[-_]/).filter((t) => t.length > 0);

  // First token is usually the generation (may have dots: "4.1", "5.2", or letters: "4o")
  if (tokens.length > 0 && tokens[0] !== undefined) {
    const genToken = tokens[0];
    // Check if it's a generation (starts with digit or is like "4o")
    if (/^\d/.test(genToken)) {
      result.generation = genToken;

      // Remaining tokens: tiers and variants
      for (let i = 1; i < tokens.length; i++) {
        const tok = tokens[i]?.toLowerCase() ?? "";
        if (SIZE_TIERS.has(tok)) {
          // Could be a compound tier like "codex-mini" — check next token
          if (result.tier === undefined) {
            result.tier = tok;
          } else {
            // If we already have a tier, this could be a compound: e.g., "codex-mini"
            // In that case, the first was a variant, fix it
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

  // Special: handle "codex" as a variant, not a tier
  if (result.tier === "codex" || result.tier === "chat") {
    result.variant = result.tier;
    result.tier = undefined;
  }

  // Handle compound variants like gpt-5.1-codex-mini → variant=codex, tier=mini
  if (result.variant === "codex" && tokens.length > 2) {
    const lastTok = tokens[tokens.length - 1]?.toLowerCase() ?? "";
    if (SIZE_TIERS.has(lastTok) && lastTok !== "codex") {
      result.tier = lastTok;
    }
  }

  return result;
}

/**
 * Parse Gemini model names.
 * Format: gemini-{GEN}-{TIER}[-{VARIANT}][-{DATE}]
 * Tiers: flash, flash-lite, pro, embedding
 */
function parseGemini(rest: string): ParsedBareId {
  const result: ParsedBareId = {
    family: "gemini",
    generation: "",
  };

  let working = rest;

  // Extract dates (various formats in Vertex)
  const d8 = extractDate8(working);
  if (d8) {
    result.date = d8.date;
    working = d8.rest;
  }

  // Check for "latest" alias (e.g., "flash-latest", "flash-lite-latest")
  working = working.replace(/-latest$/, "");

  // Check for preview with date like "preview-04-17" or "preview-09-2025"
  const previewDateMatch = working.match(/-(preview)(?:-(\d{2})-(\d{2,4}))?$/);
  if (previewDateMatch) {
    result.isPreview = true;
    // If there's a date suffix, extract it
    if (previewDateMatch[2] !== undefined && previewDateMatch[3] !== undefined) {
      // Keep the date as part of the identity for specific preview builds
      // But don't set result.date — it's a preview date, not a release date
    }
    working = working.slice(0, working.length - previewDateMatch[0].length);
  }

  const tokens = working.split(/[-_]/).filter((t) => t.length > 0);

  // First token should be the generation
  if (tokens.length > 0 && tokens[0] !== undefined && /^\d/.test(tokens[0])) {
    result.generation = tokens[0];

    // Remaining: tier and sub-tier
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
      result.tier = tierParts.join("-"); // "flash", "flash-lite", "pro"
    }
  } else {
    // No generation: "gemini-flash-latest" → tier=flash
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

/**
 * Parse Llama model names.
 * Bedrock: llama{GEN}[-{MINOR}]-{SIZE}b-instruct
 * Azure: [meta-]llama-{GEN}[-{SIZE}b][-variant]-instruct
 */
function parseLlama(rest: string): ParsedBareId {
  const result: ParsedBareId = {
    family: "llama",
    generation: "",
  };

  let working = rest;

  // Strip "meta-" prefix if present (Azure sometimes has it)
  working = working.replace(/^meta-?/i, "");
  // Strip "llama-" if doubled (from "meta-llama-3.1...")
  working = working.replace(/^llama-?/i, "");

  // Normalize versions: dots to consistent format
  const tokens = working.split(/[-_]/).filter((t) => t.length > 0);

  // Collect generation parts (leading digits)
  const genParts: string[] = [];
  let i = 0;
  // First token might contain dot version like "3.1"
  if (tokens[0] !== undefined && /^\d/.test(tokens[0])) {
    // Could be "3.1" or "3" or "4"
    if (tokens[0].includes(".")) {
      genParts.push(tokens[0]);
      i = 1;
    } else {
      genParts.push(tokens[0]);
      i = 1;
      // Check if next token is a pure digit (minor version in dash format)
      while (i < tokens.length) {
        const tok = tokens[i];
        if (tok === undefined || !/^\d+$/.test(tok) || parseInt(tok) >= 10) break;
        genParts.push(tok);
        i++;
      }
    }
  }

  result.generation = genParts.length > 1 ? genParts.join(".") : (genParts[0] ?? "");

  // Remaining tokens: look for size, variant, tier
  for (; i < tokens.length; i++) {
    const tok = tokens[i]?.toLowerCase() ?? "";

    // Size: NNb
    const sMatch = tok.match(/^(\d+)b$/i);
    if (sMatch && sMatch[1] !== undefined) {
      result.sizeBillions = parseInt(sMatch[1]);
      continue;
    }

    // Expert count: NNe
    if (/^\d+e$/i.test(tok)) continue; // ignore expert count

    // Quantization: fp8, fp16
    const qMatch = tok.match(/^fp(\d+)$/i);
    if (qMatch) {
      result.quantization = tok.toLowerCase();
      continue;
    }

    // Context: NNk
    const ctxMatch = tok.match(/^(\d+)k$/i);
    if (ctxMatch && ctxMatch[1] !== undefined) {
      result.contextK = parseInt(ctxMatch[1]);
      continue;
    }

    // Known variants
    if (tok === "instruct" || tok === "vision" || tok === "it") {
      result.variant = result.variant ? `${result.variant}-${tok}` : tok;
      continue;
    }

    // Named variants: scout, maverick
    if (tok === "scout" || tok === "maverick") {
      result.tier = tok;
      continue;
    }

    // API version: v1, v2
    if (/^v\d+$/.test(tok)) continue;
  }

  return result;
}

/**
 * Parse O-series model names (o1, o3, o4-mini).
 */
function parseOSeries(rest: string): ParsedBareId {
  const result: ParsedBareId = {
    family: "o",
    generation: "",
  };

  const tokens = rest.split(/[-_]/).filter((t) => t.length > 0);

  // First token is the generation number
  if (tokens[0] !== undefined && /^\d+$/.test(tokens[0])) {
    result.generation = tokens[0];
  }

  // Remaining: tier and variant
  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i]?.toLowerCase() ?? "";
    if (SIZE_TIERS.has(tok)) {
      result.tier = tok;
    } else if (tok === "preview") {
      result.isPreview = true;
    } else if (VARIANTS.has(tok) || tok === "deep-research") {
      result.variant = result.variant ? `${result.variant}-${tok}` : tok;
    } else if (tok === "deep") {
      // Start of "deep-research" compound
      const next = tokens[i + 1]?.toLowerCase() ?? "";
      if (next === "research") {
        result.variant = "deep-research";
        i++;
      }
    }
  }

  return result;
}

/**
 * Generic parser for model families that follow a straightforward pattern:
 * {FAMILY}-{GEN}[-{TIER}][-{SIZE}b][-{VARIANT}][-{DATE}]
 *
 * Used for: grok, glm, phi, mistral, deepseek, qwen, jamba, nova, etc.
 */
function parseGeneric(family: string, rest: string): ParsedBareId {
  const result: ParsedBareId = {
    family,
    generation: "",
  };

  let working = rest;

  // Extract 8-digit date
  const d8 = extractDate8(working);
  if (d8) {
    result.date = d8.date;
    working = d8.rest;
  }

  // Extract 4-digit date (YYMM or MMDD — ambiguous, store as-is)
  // Only if it appears at the end or followed by a delimiter
  const d4Match = working.match(/(?:^|-)(\d{4})(?:$|-)/);
  if (d4Match && !result.date && d4Match[1] !== undefined) {
    // Distinguish dates from versions: dates are usually 4 digits at the end
    // For Mistral: 2402, 2411, 2503, 2505 are dates (YYMM)
    const val = parseInt(d4Match[1]);
    if (val > 2000 && val < 2600) {
      // Likely a YYMM date
      result.date = d4Match[1];
      const idx = d4Match.index ?? 0;
      const prefix = idx > 0 ? working.slice(0, idx) : "";
      const suffix = working.slice(idx + d4Match[0].length);
      working = [prefix, suffix].filter(Boolean).join("-").replace(/^-|-$/g, "");
    }
  }

  // Extract parameter size: NNb (but not in the middle of a word)
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

  // Strip version suffix: -vN (Bedrock API version)
  working = working.replace(/-v\d+$/, "");

  const tokens = working.split(/[-_]/).filter((t) => t.length > 0);

  // First token: generation (if it starts with a digit, or is a prefixed version like v3.2, m2.1, r1, k2.5)
  let i = 0;
  if (tokens[0] !== undefined && /^\d/.test(tokens[0])) {
    // Could be "3.5", "4.1", "2.0", "3", etc.
    result.generation = tokens[0];
    i = 1;

    // Check for dash-separated minor version
    const minorTok = tokens[i];
    if (minorTok !== undefined && /^\d+$/.test(minorTok) && parseInt(minorTok) < 10) {
      result.generation = `${result.generation}.${minorTok}`;
      i++;
    }
  } else if (tokens[0] !== undefined && /^[vmrk]\d[\d.]*$/i.test(tokens[0])) {
    // Prefixed version identifiers: v3.2, m2.1, r1, k2.5
    // Keep the prefix as part of the generation to distinguish e.g. v3 from r1
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
      // Modifier on variant: "reasoning-plus", "command-r-plus"
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
      // A numeric token appearing after variants/tiers when no generation
      // was found yet (e.g., "grok-code" → rest="fast-1" → generation="1")
      result.generation = tok;
    }
  }

  return result;
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

    // Provider wrapper metadata
    region: stripped.region,
    vendor: stripped.vendor,
    deploymentVersion: stripped.deploymentVersion,
    routingTag: stripped.routingTag,
    maasSuffix: stripped.maasSuffix,

    // Core features
    family: parsed.family,
    generation: parsed.generation,
    tier: parsed.tier,
    variant: parsed.variant,

    // Secondary features
    sizeBillions: parsed.sizeBillions,
    activeBillions: parsed.activeBillions,
    date: parsed.date,
    contextK: parsed.contextK,
    quantization: parsed.quantization,

    // Flags
    isOpenSource: parsed.isOpenSource,
    isSafety: parsed.isSafety,
    isPreview: parsed.isPreview,
  };
}
