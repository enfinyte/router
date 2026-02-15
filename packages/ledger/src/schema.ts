export const TABLE_NAME = "llm_requests";
export const METRICS_1M_VIEW = "llm_metrics_1m";

export type LedgerInterval = "15M" | "1H" | "1D" | "7D";

export const INTERVAL_SQL: Record<LedgerInterval, string> = {
  "15M": "15 minutes",
  "1H": "1 hour",
  "1D": "1 day",
  "7D": "7 days",
};

export const BUCKET_SQL: Record<LedgerInterval, string> = {
  "15M": "1 minute",
  "1H": "1 minute",
  "1D": "1 hour",
  "7D": "1 hour",
};

export interface Transaction {
  timestamp: Date;
  request_id: string | null;
  provider: string;
  model: string;
  category: string | null;
  resolution_latency_ms: number | null;
  ttft_ms: number | null;
  total_latency_ms: number | null;
  input_tokens: number | null;
  reasoning_tokens: number | null;
  output_tokens: number | null;
  input_cost_usd: number | null;
  reasoning_cost_usd: number | null;
  output_cost_usd: number | null;
  http_status_code: number | null;
  error_type: string | null;
  is_streaming: boolean | null;
  user_id: string | null;
}

export interface DashboardOverview {
  total_requests: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  avg_resolution_latency_ms: number;
  total_cost_usd: number;
  error_rate: number;
  total_errors: number;
  total_rate_limits: number;
}

export interface TimeSeriesBucket {
  bucket: Date;
  request_count: number;
  avg_latency_ms: number;
  avg_resolution_latency_ms: number;
  total_cost_usd: number;
  error_count: number;
  rate_limit_count: number;
}

export interface ProviderModelLatency {
  provider: string;
  model: string;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  avg_ttft_ms: number;
  avg_resolution_latency_ms: number;
  request_count: number;
}

export interface ModelCost {
  provider: string;
  model: string;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_reasoning_tokens: number;
}

export interface ErrorRateMetric {
  provider: string;
  model: string;
  request_count: number;
  error_count: number;
  rate_limit_count: number;
  error_rate: number;
}
