"use client";
import { useQuery } from "@tanstack/react-query";
import ky from "ky";
import { BASE_URL } from ".";

export type AnalyticsInterval = "15M" | "1H" | "1D" | "7D";

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
  bucket: string;
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

export function useAnalyticsOverview(interval: AnalyticsInterval) {
  return useQuery({
    queryKey: ["analytics", "overview", interval],
    queryFn: () =>
      ky
        .get(`${BASE_URL}/v1/analytics/overview?interval=${interval}`, {
          credentials: "include",
        })
        .json<{ overview: DashboardOverview }>(),
  });
}

export function useAnalyticsTimeSeries(interval: AnalyticsInterval) {
  return useQuery({
    queryKey: ["analytics", "timeseries", interval],
    queryFn: () =>
      ky
        .get(`${BASE_URL}/v1/analytics/timeseries?interval=${interval}`, {
          credentials: "include",
        })
        .json<{ timeseries: TimeSeriesBucket[] }>(),
  });
}

export function useAnalyticsLatency(interval: AnalyticsInterval) {
  return useQuery({
    queryKey: ["analytics", "latency", interval],
    queryFn: () =>
      ky
        .get(`${BASE_URL}/v1/analytics/latency?interval=${interval}`, {
          credentials: "include",
        })
        .json<{ latency: ProviderModelLatency[] }>(),
  });
}

export function useAnalyticsCost(interval: AnalyticsInterval) {
  return useQuery({
    queryKey: ["analytics", "cost", interval],
    queryFn: () =>
      ky
        .get(`${BASE_URL}/v1/analytics/cost?interval=${interval}`, {
          credentials: "include",
        })
        .json<{ cost: ModelCost[] }>(),
  });
}

export function useAnalyticsErrors(interval: AnalyticsInterval) {
  return useQuery({
    queryKey: ["analytics", "errors", interval],
    queryFn: () =>
      ky
        .get(`${BASE_URL}/v1/analytics/errors?interval=${interval}`, {
          credentials: "include",
        })
        .json<{ errors: ErrorRateMetric[] }>(),
  });
}
