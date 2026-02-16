"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsLatency, type AnalyticsInterval } from "@/lib/api/analytics";
import { useIsInitialMount } from "@/hooks/use-initial-mount";

function truncateLabel(provider: string, model: string): string {
  const short = `${provider} / ${model}`;
  if (short.length <= 22) return short;
  return model.length > 22 ? `${model.slice(0, 19)}...` : model;
}

const PERCENTILES = {
  avg_latency_ms: "Average",
  p50_latency_ms: "P50",
  p95_latency_ms: "P95",
  p99_latency_ms: "P99",
} as const;

type PercentileKey = keyof typeof PERCENTILES;

export function LatencyChart({ interval }: { interval: AnalyticsInterval }) {
  const [percentile, setPercentile] = useState<PercentileKey>("avg_latency_ms");
  const { data, isLoading, isError } = useAnalyticsLatency(interval);
  const animate = useIsInitialMount();

  const chartConfig = useMemo<ChartConfig>(() => ({
    [percentile]: { label: PERCENTILES[percentile], color: "var(--chart-2)" },
  }), [percentile]);

  const chartData = useMemo(() => {
    if (!data?.latency) return [];
    return data.latency.map((item) => ({
      ...item,
      label: truncateLabel(item.provider, item.model),
      fullLabel: `${item.provider} / ${item.model}`,
    }));
  }, [data]);

  const header = (
    <CardHeader className="flex flex-row items-start justify-between space-y-0">
      <div className="flex flex-col gap-1.5">
        <CardTitle>Latency by Provider/Model</CardTitle>
        <CardDescription>{PERCENTILES[percentile]} response time per model</CardDescription>
      </div>
      <Select value={percentile} onValueChange={(v) => setPercentile(v as PercentileKey)}>
        <SelectTrigger className="w-28" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="avg_latency_ms">Average</SelectItem>
          <SelectItem value="p50_latency_ms">P50</SelectItem>
          <SelectItem value="p95_latency_ms">P95</SelectItem>
          <SelectItem value="p99_latency_ms">P99</SelectItem>
        </SelectContent>
      </Select>
    </CardHeader>
  );

  if (isLoading) {
    return (
      <Card>
        {header}
        <CardContent>
          <Skeleton className="min-h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        {header}
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          Failed to load latency data
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        {header}
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          No latency data for this time range
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {header}
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 20 }}
            barCategoryGap="20%"
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={160}
              tick={{ fontSize: 12 }}
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(value: number) => `${value}ms`}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const item = payload[0].payload;
                const all = [
                  { key: "avg_latency_ms" as const, label: "Avg", value: item.avg_latency_ms },
                  { key: "p50_latency_ms" as const, label: "P50", value: item.p50_latency_ms },
                  { key: "p95_latency_ms" as const, label: "P95", value: item.p95_latency_ms },
                  { key: "p99_latency_ms" as const, label: "P99", value: item.p99_latency_ms },
                ];

                return (
                  <div className="grid min-w-[10rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <span className="font-medium text-foreground">{item.fullLabel}</span>
                    {all.map((m) => (
                      <div key={m.key} className="flex items-center gap-2">
                        <span className={m.key === percentile ? "font-semibold text-foreground" : "text-muted-foreground"}>
                          {m.label}:
                        </span>
                        <span className={`ml-auto font-mono ${m.key === percentile ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
                          {m.value.toFixed(0)}ms
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 border-t pt-1">
                      <span className="text-muted-foreground">Requests:</span>
                      <span className="ml-auto font-mono font-medium text-foreground">
                        {item.request_count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey={percentile}
              fill={`var(--color-${percentile})`}
              radius={[0, 4, 4, 0]}
              isAnimationActive={animate}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
