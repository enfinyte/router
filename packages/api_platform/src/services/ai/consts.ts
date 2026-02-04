import type { ResponseResource } from "../responses/schema";

export const DEFAULT_TEMPERATURE: ResponseResource["temperature"] = 1.0;
export const DEFAULT_TOP_P: ResponseResource["top_p"] = 1.0;
export const DEFAULT_PRESENCE_PENALTY: ResponseResource["presence_penalty"] = 0.0;
export const DEFAULT_FREQUENCY_PENALTY: ResponseResource["frequency_penalty"] = 0.0;
export const DEFAULT_TOP_LOGPROBS: ResponseResource["top_logprobs"] = 0;
export const DEFAULT_TRUNCATION: ResponseResource["truncation"] = "auto";
export const DEFAULT_PARALLEL_TOOL_CALLS: ResponseResource["parallel_tool_calls"] = false;
export const DEFAULT_STORE: ResponseResource["store"] = true;
export const DEFAULT_BACKGROUND: ResponseResource["background"] = false;
export const DEFAULT_SERVICE_TIER: ResponseResource["service_tier"] = "default";

export const MOCK_INPUT_TOKENS = 1000;
export const MOCK_OUTPUT_TOKENS = 100;
export const MOCK_REASONING_TOKENS = 0;
export const MOCK_CACHED_TOKENS = 0;
