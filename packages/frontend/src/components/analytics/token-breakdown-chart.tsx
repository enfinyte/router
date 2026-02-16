"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsCost, type AnalyticsInterval } from "@/lib/api/analytics";
import { useIsInitialMount } from "@/hooks/use-initial-mount";

function truncateLabel(provider: string, model: string): string {
  const short = `${provider} / ${model}`;
  if (short.length <= 22) return short;
  return model.length > 22 ? `${model.slice(0, 19)}...` : model;
}

const chartConfig = {
  total_input_tokens: {
    label: "Input",
    color: "oklch(0.82 0.06 196)",
  },
  total_output_tokens: {
    label: "Output",
    color: "var(--chart-1)",
  },
  total_reasoning_tokens: {
    label: "Reasoning",
    color: "oklch(0.45 0.08 196)",
  },
} satisfies ChartConfig;

export function TokenBreakdownChart({ interval }: { interval: AnalyticsInterval }) {
  const { data, isLoading, isError } = useAnalyticsCost(interval);
  const animate = useIsInitialMount();

  const chartData = useMemo(() => {
    if (!data?.cost) return [];
    return data.cost.map((item) => ({
      ...item,
      label: truncateLabel(item.provider, item.model),
      fullLabel: `${item.provider} / ${item.model}`,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Usage by Model</CardTitle>
          <CardDescription>Breakdown by token type</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="min-h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Usage by Model</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          Failed to load token data
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Usage by Model</CardTitle>
          <CardDescription>Breakdown by token type</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          No token data for this time range
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Usage by Model</CardTitle>
        <CardDescription>Breakdown by token type</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 20 }}
            barCategoryGap="12%"
            barGap={0}
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
              tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const item = payload[0].payload;
                const metrics = [
                  { label: "Input", value: item.total_input_tokens, color: "var(--color-total_input_tokens)" },
                  { label: "Output", value: item.total_output_tokens, color: "var(--color-total_output_tokens)" },
                  { label: "Reasoning", value: item.total_reasoning_tokens, color: "var(--color-total_reasoning_tokens)" },
                ];

                return (
                  <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <span className="font-medium text-foreground">{item.fullLabel}</span>
                    {metrics.map((m) => (
                      <div key={m.label} className="flex items-center gap-2">
                        <div className="h-2 w-2 shrink-0" style={{ backgroundColor: m.color }} />
                        <span className="text-muted-foreground">{m.label}:</span>
                        <span className="ml-auto font-mono font-medium text-foreground">
                          {Number(m.value).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 border-t pt-1">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="ml-auto font-mono font-medium text-foreground">
                        {(Number(item.total_input_tokens) + Number(item.total_output_tokens) + Number(item.total_reasoning_tokens)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="total_input_tokens"
              fill="var(--color-total_input_tokens)"
              radius={0}
              isAnimationActive={animate}
            />
            <Bar
              dataKey="total_output_tokens"
              fill="var(--color-total_output_tokens)"
              radius={0}
              isAnimationActive={animate}
            />
            <Bar
              dataKey="total_reasoning_tokens"
              fill="var(--color-total_reasoning_tokens)"
              radius={0}
              isAnimationActive={animate}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
