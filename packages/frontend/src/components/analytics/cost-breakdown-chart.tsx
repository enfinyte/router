"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type AnalyticsInterval, useAnalyticsCost, type ModelCost } from "@/lib/api/analytics";

function truncateLabel(provider: string, model: string): string {
  const short = `${provider} / ${model}`;
  if (short.length <= 22) return short;
  return model.length > 22 ? `${model.slice(0, 19)}...` : model;
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsInitialMount } from "@/hooks/use-initial-mount";

const chartConfig = {
  totalCost: {
    label: "Total Cost (USD)",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function CostBreakdownChart({ interval }: { interval: AnalyticsInterval }) {
  const { data, isLoading, isError } = useAnalyticsCost(interval);
  const animate = useIsInitialMount();

  const chartData = React.useMemo(() => {
    if (!data?.cost) return [];
    return data.cost.map((item: ModelCost) => ({
      ...item,
      combinedName: truncateLabel(item.provider, item.model),
      fullName: `${item.provider} / ${item.model}`,
      total_cost_usd: Number(item.total_cost_usd),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Cost by Model</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="min-h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="h-full border-destructive/50">
        <CardHeader>
          <CardTitle>Cost by Model</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Failed to load cost data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Cost by Model</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No cost data for this time range
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Cost by Model</CardTitle>
        <CardDescription>Total cost per model</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: 0,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="combinedName"
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
              tickFormatter={(value: number) => `$${value.toFixed(2)}`}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as ModelCost & {
                  combinedName: string;
                  fullName: string;
                };
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-xs sm:p-4">
                    <div className="grid gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Model
                        </span>
                        <span className="font-bold text-muted-foreground">{data.fullName}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Total Cost
                        </span>
                        <span className="font-bold">${data.total_cost_usd.toFixed(4)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 border-t pt-2 mt-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[0.60rem] uppercase text-muted-foreground">
                            Input
                          </span>
                          <span className="font-mono text-xs">
                            {data.total_input_tokens.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[0.60rem] uppercase text-muted-foreground">
                            Output
                          </span>
                          <span className="font-mono text-xs">
                            {data.total_output_tokens.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[0.60rem] uppercase text-muted-foreground">
                            Reasoning
                          </span>
                          <span className="font-mono text-xs">
                            {data.total_reasoning_tokens.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="total_cost_usd"
              fill="var(--color-totalCost)"
              radius={[0, 4, 4, 0]}
              isAnimationActive={animate}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
