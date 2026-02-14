import type { ResolvedResponse } from "../types";

export const CategoryProviderModelMap: Record<string, ResolvedResponse[]> = {
  "anthropic/claude-opus-4.5": [
    { provider: "anthropic", model: "claude-opus-4-5" },
    { provider: "anthropic", model: "claude-opus-4-5-20251101" },
    { provider: "azure", model: "claude-opus-4-5" },
    { provider: "google-vertex-anthropic", model: "claude-opus-4-5@20251101" },
    { provider: "amazon-bedrock", model: "anthropic.claude-opus-4-5-20251101-v1:0" },
    { provider: "amazon-bedrock", model: "us.anthropic.claude-opus-4-5-20251101-v1:0" },
    { provider: "amazon-bedrock", model: "eu.anthropic.claude-opus-4-5-20251101-v1:0" },
    { provider: "amazon-bedrock", model: "global.anthropic.claude-opus-4-5-20251101-v1:0" },
  ],
  "anthropic/claude-opus-4.6": [
    { provider: "anthropic", model: "claude-opus-4-6" },
    { provider: "azure", model: "claude-opus-4-6" },
    { provider: "google-vertex-anthropic", model: "claude-opus-4-6@default" },
    { provider: "amazon-bedrock", model: "anthropic.claude-opus-4-6-v1" },
    { provider: "amazon-bedrock", model: "us.anthropic.claude-opus-4-6-v1" },
    { provider: "amazon-bedrock", model: "eu.anthropic.claude-opus-4-6-v1" },
    { provider: "amazon-bedrock", model: "global.anthropic.claude-opus-4-6-v1" },
  ],
  "anthropic/claude-sonnet-4": [
    { provider: "anthropic", model: "claude-sonnet-4-0" },
    { provider: "anthropic", model: "claude-sonnet-4-20250514" },
    { provider: "google-vertex-anthropic", model: "claude-sonnet-4@20250514" },
    { provider: "amazon-bedrock", model: "anthropic.claude-sonnet-4-20250514-v1:0" },
    { provider: "amazon-bedrock", model: "us.anthropic.claude-sonnet-4-20250514-v1:0" },
    { provider: "amazon-bedrock", model: "eu.anthropic.claude-sonnet-4-20250514-v1:0" },
    { provider: "amazon-bedrock", model: "global.anthropic.claude-sonnet-4-20250514-v1:0" },
  ],
  "anthropic/claude-sonnet-4.5": [
    { provider: "anthropic", model: "claude-sonnet-4-5" },
    { provider: "anthropic", model: "claude-sonnet-4-5-20250929" },
    { provider: "azure", model: "claude-sonnet-4-5" },
    { provider: "google-vertex-anthropic", model: "claude-sonnet-4-5@20250929" },
    { provider: "amazon-bedrock", model: "anthropic.claude-sonnet-4-5-20250929-v1:0" },
    { provider: "amazon-bedrock", model: "us.anthropic.claude-sonnet-4-5-20250929-v1:0" },
    { provider: "amazon-bedrock", model: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0" },
    { provider: "amazon-bedrock", model: "global.anthropic.claude-sonnet-4-5-20250929-v1:0" },
  ],
  "deepseek/deepseek-chat-v3-0324": [
    { provider: "azure", model: "deepseek-v3-0324" },
    { provider: "amazon-bedrock", model: "deepseek.v3-v1:0" },
  ],
  "deepseek/deepseek-chat-v3.1": [{ provider: "azure", model: "deepseek-v3.1" }],
  "deepseek/deepseek-v3.2": [
    { provider: "azure", model: "deepseek-v3.2" },
    { provider: "azure", model: "deepseek-v3.2-speciale" },
  ],
  "google/gemini-2.0-flash-001": [{ provider: "google-vertex", model: "gemini-2.0-flash" }],
  "google/gemini-2.5-flash": [{ provider: "google-vertex", model: "gemini-2.5-flash" }],
  "google/gemini-2.5-flash-lite": [{ provider: "google-vertex", model: "gemini-2.5-flash-lite" }],
  "google/gemini-2.5-flash-lite-preview-09-2025": [
    { provider: "google-vertex", model: "gemini-2.5-flash-lite-preview-09-2025" },
  ],
  "google/gemini-2.5-pro": [{ provider: "google-vertex", model: "gemini-2.5-pro" }],
  "google/gemini-3-flash-preview": [{ provider: "google-vertex", model: "gemini-3-flash-preview" }],
  "meta-llama/llama-3.1-8b-instruct": [
    { provider: "azure", model: "meta-llama-3.1-8b-instruct" },
    { provider: "amazon-bedrock", model: "meta.llama3-1-8b-instruct-v1:0" },
  ],
  "minimax/minimax-m2.1": [{ provider: "amazon-bedrock", model: "minimax.minimax-m2" }],
  "mistralai/mistral-small-3.2-24b-instruct": [{ provider: "azure", model: "mistral-small-2503" }],
  "moonshotai/kimi-k2.5": [
    { provider: "azure", model: "kimi-k2.5" },
    { provider: "amazon-bedrock", model: "moonshotai.kimi-k2.5" },
  ],
  "openai/gpt-4.1": [
    { provider: "openai", model: "gpt-4.1" },
    { provider: "azure", model: "gpt-4.1" },
  ],
  "openai/gpt-4o": [
    { provider: "openai", model: "gpt-4o" },
    { provider: "azure", model: "gpt-4o" },
  ],
  "openai/gpt-4o-mini": [
    { provider: "openai", model: "gpt-4o-mini" },
    { provider: "azure", model: "gpt-4o-mini" },
  ],
  "openai/gpt-5-mini": [
    { provider: "openai", model: "gpt-5-mini" },
    { provider: "azure", model: "gpt-5-mini" },
  ],
  "openai/gpt-5-nano": [
    { provider: "openai", model: "gpt-5-nano" },
    { provider: "azure", model: "gpt-5-nano" },
  ],
  "openai/gpt-5.1": [
    { provider: "openai", model: "gpt-5.1" },
    { provider: "azure", model: "gpt-5.1" },
  ],
  "openai/gpt-5.2": [
    { provider: "openai", model: "gpt-5.2" },
    { provider: "azure", model: "gpt-5.2" },
  ],
  "openai/gpt-oss-120b": [
    { provider: "amazon-bedrock", model: "openai.gpt-oss-120b-1:0" },
    { provider: "google-vertex", model: "openai/gpt-oss-120b-maas" },
  ],
  "openai/gpt-oss-20b": [
    { provider: "amazon-bedrock", model: "openai.gpt-oss-20b-1:0" },
    { provider: "google-vertex", model: "openai/gpt-oss-20b-maas" },
  ],
  "openai/gpt-oss-safeguard-20b": [
    { provider: "amazon-bedrock", model: "openai.gpt-oss-safeguard-20b" },
  ],
  "qwen/qwen3-235b-a22b-thinking-2507": [
    { provider: "amazon-bedrock", model: "qwen.qwen3-235b-a22b-2507-v1:0" },
  ],
  "qwen/qwen3-30b-a3b": [{ provider: "amazon-bedrock", model: "qwen.qwen3-coder-30b-a3b-v1:0" }],
  "x-ai/grok-4-fast": [
    { provider: "azure", model: "grok-4-fast-reasoning" },
    { provider: "azure", model: "grok-4-fast-non-reasoning" },
  ],
  "x-ai/grok-code-fast-1": [{ provider: "azure", model: "grok-code-fast-1" }],
  "z-ai/glm-4.7": [{ provider: "google-vertex", model: "zai-org/glm-4.7-maas" }],
};
