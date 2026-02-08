import type { ResolvedResponse } from "../types";

export const OpenRouterProviderModelMap: Record<string, ResolvedResponse[]> = {
  "anthropic/claude-opus-4.5": [
    { provider: "google-vertex-anthropic", model: "claude-opus-4-5@20251101" },
    { provider: "anthropic", model: "claude-opus-4-5-20251101" },
    { provider: "azure", model: "claude-opus-4-5" },
    { provider: "anthropic", model: "claude-opus-4-5" },
    { provider: "azure-cognitive-services", model: "claude-opus-4-5" },
    { provider: "amazon-bedrock", model: "eu.anthropic.claude-opus-4-5-20251101-v1:0" },
    { provider: "amazon-bedrock", model: "us.anthropic.claude-opus-4-5-20251101-v1:0" },
    { provider: "amazon-bedrock", model: "global.anthropic.claude-opus-4-5-20251101-v1:0" },
  ],
  "anthropic/claude-haiku-4.5": [
    { provider: "amazon-bedrock", model: "us.anthropic.claude-haiku-4-5-20251001-v1:0" },
    { provider: "google-vertex-anthropic", model: "claude-haiku-4-5@20251001" },
    { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
    { provider: "azure", model: "claude-haiku-4-5" },
    { provider: "anthropic", model: "claude-haiku-4-5" },
    { provider: "azure-cognitive-services", model: "claude-haiku-4-5" },
    { provider: "amazon-bedrock", model: "eu.anthropic.claude-haiku-4-5-20251001-v1:0" },
    { provider: "amazon-bedrock", model: "global.anthropic.claude-haiku-4-5-20251001-v1:0" },
  ],
  "anthropic/claude-sonnet-4.5": [
    { provider: "google-vertex-anthropic", model: "claude-sonnet-4-5@20250929" },
    { provider: "amazon-bedrock", model: "us-gov.anthropic.claude-sonnet-4-5-20250929-v1:0" },
    { provider: "anthropic", model: "claude-sonnet-4-5-20250929" },
    { provider: "azure", model: "claude-sonnet-4-5" },
    { provider: "opencode", model: "claude-sonnet-4-5" },
    { provider: "anthropic", model: "claude-sonnet-4-5" },
    { provider: "azure-cognitive-services", model: "claude-sonnet-4-5" },
    { provider: "amazon-bedrock", model: "us.anthropic.claude-sonnet-4-5-20250929-v1:0" },
    { provider: "amazon-bedrock", model: "global.anthropic.claude-sonnet-4-5-20250929-v1:0" },
    { provider: "amazon-bedrock", model: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0" },
  ],
  "anthropic/claude-sonnet-4": [
    { provider: "amazon-bedrock", model: "eu.anthropic.claude-sonnet-4-20250514-v1:0" },
    { provider: "amazon-bedrock", model: "us.anthropic.claude-sonnet-4-20250514-v1:0" },
    { provider: "amazon-bedrock", model: "global.anthropic.claude-sonnet-4-20250514-v1:0" },
    { provider: "google-vertex-anthropic", model: "claude-sonnet-4@20250514" },
    { provider: "anthropic", model: "claude-sonnet-4-0" },
    { provider: "google-vertex-anthropic", model: "claude-sonnet-4@20250514" },
    { provider: "amazon-bedrock", model: "apac.anthropic.claude-sonnet-4-20250514-v1:0" },
  ],
  "deepseek/deepseek-chat-v3-0324": [
    { provider: "azure", model: "deepseek-v3-0324" },
    { provider: "azure-cognitive-services", model: "deepseek-v3-0324" },
  ],
  "deepseek/deepseek-chat-v3.1": [
    { provider: "azure", model: "deepseek-v3.1" },
    { provider: "azure-cognitive-services", model: "deepseek-v3.1" },
    { provider: "amazon-bedrock", model: "deepseek.v3-v1:0" },
  ],
  "deepseek/deepseek-v3.2": [
    { provider: "azure", model: "deepseek-v3.2-speciale" },
    { provider: "azure-cognitive-services", model: "deepseek-v3.2-speciale" },
    { provider: "azure", model: "deepseek-v3.2" },
    { provider: "azure-cognitive-services", model: "deepseek-v3.2" },
  ],
  "google/gemini-2.0-flash-001": [
    { provider: "google", model: "gemini-2.0-flash" },
    { provider: "google-vertex", model: "gemini-2.0-flash" },
  ],
  "google/gemini-2.5-flash": [
    { provider: "google", model: "gemini-2.5-flash" },
    { provider: "google-vertex", model: "gemini-2.5-flash" },
  ],
  "google/gemini-2.5-flash-lite": [
    { provider: "google", model: "gemini-2.5-flash-lite" },
    { provider: "google-vertex", model: "gemini-2.5-flash-lite" },
  ],
  "google/gemini-2.5-flash-lite-preview-09-2025": [
    { provider: "google", model: "gemini-2.5-flash-lite-preview-09-2025" },
    { provider: "google-vertex", model: "gemini-2.5-flash-lite-preview-09-2025" },
  ],
  "google/gemini-2.5-pro": [
    { provider: "google", model: "gemini-2.5-pro" },
    { provider: "google-vertex", model: "gemini-2.5-pro" },
  ],
  "google/gemini-3-flash-preview": [
    { provider: "google", model: "gemini-3-flash-preview" },
    { provider: "google-vertex", model: "gemini-3-flash-preview" },
    { provider: "google", model: "gemini-2.5-flash-preview-09-2025" },
    { provider: "google-vertex", model: "gemini-2.5-flash-preview-09-2025" },
  ],
  "google/gemini-3-pro-preview": [
    { provider: "google", model: "gemini-3-pro-preview" },
    { provider: "google-vertex", model: "gemini-3-pro-preview" },
  ],
  "google/gemma-3-12b-it": [{ provider: "amazon-bedrock", model: "google.gemma-3-12b-it" }],
  "meta-llama/llama-3.1-8b-instruct": [
    { provider: "azure", model: "meta-llama-3.1-8b-instruct" },
    { provider: "azure-cognitive-services", model: "meta-llama-3.1-8b-instruct" },
    { provider: "amazon-bedrock", model: "meta.llama3-1-8b-instruct-v1:0" },
    { provider: "amazon-bedrock", model: "us.meta.llama3-1-8b-instruct-v1:0" },
  ],
  "meta-llama/llama-3.3-70b-instruct": [
    { provider: "amazon-bedrock", model: "us.meta.llama3-3-70b-instruct-v1:0" },
    { provider: "azure", model: "llama-3.3-70b-instruct" },
    { provider: "azure-cognitive-services", model: "llama-3.3-70b-instruct" },
  ],
  "minimax/minimax-m2.1": [{ provider: "amazon-bedrock", model: "minimax.minimax-m2" }],
  "qwen/qwen3-235b-a22b": [{ provider: "amazon-bedrock", model: "qwen.qwen3-vl-235b-a22b" }],
  "qwen/qwen3-235b-a22b-2507": [
    { provider: "amazon-bedrock", model: "qwen.qwen3-235b-a22b-2507-v1:0" },
  ],
  "qwen/qwen3-30b-a3b": [{ provider: "amazon-bedrock", model: "qwen.qwen3-coder-30b-a3b-v1:0" }],
  "openai/gpt-4o-mini": [
    { provider: "azure", model: "gpt-4o-mini" },
    { provider: "openai", model: "gpt-4o-mini" },
    { provider: "azure-cognitive-services", model: "gpt-4o-mini" },
    { provider: "azure", model: "o4-mini" },
    { provider: "openai", model: "o4-mini" },
    { provider: "azure-cognitive-services", model: "o4-mini" },
  ],
  "openai/gpt-5-mini": [
    { provider: "azure", model: "gpt-5-mini" },
    { provider: "openai", model: "gpt-5-mini" },
    { provider: "azure-cognitive-services", model: "gpt-5-mini" },
  ],
  "openai/gpt-5-nano": [
    { provider: "azure", model: "gpt-5-nano" },
    { provider: "openai", model: "gpt-5-nano" },
    { provider: "azure-cognitive-services", model: "gpt-5-nano" },
  ],
  "openai/gpt-5.1": [
    { provider: "openai", model: "gpt-5.1" },
    { provider: "azure-cognitive-services", model: "gpt-5.1" },
  ],
  "openai/gpt-5.2": [
    { provider: "azure", model: "gpt-5.2" },
    { provider: "opencode", model: "gpt-5.2" },
    { provider: "openai", model: "gpt-5.2" },
  ],
  "openai/gpt-5.2-codex": [
    { provider: "azure", model: "gpt-5.2-codex" },
    { provider: "openai", model: "gpt-5.2-codex" },
    { provider: "azure-cognitive-services", model: "gpt-5.2-codex" },
  ],
  "openai/gpt-oss-120b": [
    { provider: "amazon-bedrock", model: "openai.gpt-oss-120b-1:0" },
    { provider: "google-vertex", model: "openai/gpt-oss-120b-maas" },
  ],
};
