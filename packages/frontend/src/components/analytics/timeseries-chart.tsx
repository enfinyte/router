"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { type AnalyticsInterval, useAnalyticsTimeSeries } from "@/lib/api/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsInitialMount } from "@/hooks/use-initial-mount";

const chartConfig = {
  requestCount: {
    label: "Requests",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function TimeSeriesChart({ interval }: { interval: AnalyticsInterval }) {
  const { data, isLoading, isError } = useAnalyticsTimeSeries(interval);
  const animate = useIsInitialMount();

  const formattedRange = React.useMemo(() => {
    if (!data?.timeseries || data.timeseries.length === 0) return "";

    const startDate = new Date(data.timeseries[0]?.bucket || "");
    const endDate = new Date(data.timeseries[data.timeseries.length - 1]?.bucket || "");

    return `${startDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} - ${endDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;
  }, [data]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Request Volume</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-auto h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="h-full border-destructive/50">
        <CardHeader>
          <CardTitle>Request Volume</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            Failed to load time series data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.timeseries || data.timeseries.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Request Volume</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            No data for this time range
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Request Volume</CardTitle>
        <CardDescription>Requests over time ({formattedRange})</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart
            accessibilityLayer
            data={data.timeseries}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="bucket"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: interval === "15M" || interval === "1H" ? "numeric" : undefined,
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    });
                  }}
                />
              }
            />
            <defs>
              <linearGradient id="fillRequestCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-requestCount)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-requestCount)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="request_count"
              type="natural"
              fill="url(#fillRequestCount)"
              fillOpacity={0.4}
              stroke="var(--color-requestCount)"
              stackId="a"
              isAnimationActive={animate}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
