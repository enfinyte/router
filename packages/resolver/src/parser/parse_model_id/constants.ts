export const REGIONS = new Set(["us", "eu", "ap", "global"]);

export const CLAUDE_TIERS = new Set(["opus", "sonnet", "haiku", "instant"]);

export const SIZE_TIERS = new Set([
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

export const VARIANTS = new Set([
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

export const FAMILY_ROOTS = [
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
