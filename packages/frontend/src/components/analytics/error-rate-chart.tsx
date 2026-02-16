"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useAnalyticsErrors, type AnalyticsInterval } from "@/lib/api/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsInitialMount } from "@/hooks/use-initial-mount";
import { useMemo } from "react";

function truncateLabel(provider: string, model: string): string {
  const short = `${provider} / ${model}`;
  if (short.length <= 22) return short;
  return model.length > 22 ? `${model.slice(0, 19)}...` : model;
}

interface ErrorRateChartProps {
  interval: AnalyticsInterval;
}

const chartConfig = {
  errorRate: {
    label: "Error Rate (%)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ErrorRateChart({ interval }: ErrorRateChartProps) {
  const { data, isLoading, isError } = useAnalyticsErrors(interval);
  const animate = useIsInitialMount();

  const chartData = useMemo(() => {
    if (!data?.errors) return [];

    return data.errors.map((item) => ({
      ...item,
      combinedName: truncateLabel(item.provider, item.model),
      errorRatePercentage: item.error_rate * 100,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Error Rate by Model</CardTitle>
          <CardDescription>Error rate percentage per model</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Error Rate by Model</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          Failed to load error rate data
        </CardContent>
      </Card>
    );
  }

  if (!data?.errors || data.errors.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Error Rate by Model</CardTitle>
          <CardDescription>Error rate percentage per model</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          No error data for this time range
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Error Rate by Model</CardTitle>
        <CardDescription>Error rate percentage per model</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
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
              tickFormatter={(value: number) => `${value.toFixed(1)}%`}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelKey="combinedName"
                  className="w-[200px]"
                  formatter={(value, _name, item) => (
                    <>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-muted-foreground">Error Rate</span>
                        <span className="font-mono font-medium">{Number(value).toFixed(2)}%</span>
                      </div>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-muted-foreground">Errors</span>
                        <span className="font-mono font-medium">{item.payload.error_count}</span>
                      </div>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-muted-foreground">Rate Limits</span>
                        <span className="font-mono font-medium">
                          {item.payload.rate_limit_count}
                        </span>
                      </div>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-muted-foreground">Total Requests</span>
                        <span className="font-mono font-medium">{item.payload.request_count}</span>
                      </div>
                    </>
                  )}
                />
              }
            />
            <Bar
              dataKey="errorRatePercentage"
              layout="vertical"
              fill="var(--color-errorRate)"
              radius={[0, 4, 4, 0]}
              barSize={32}
              isAnimationActive={animate}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

