"use client";

import { useAnalyticsOverview } from "@/lib/api/analytics";
import type { AnalyticsInterval } from "@/lib/api/analytics";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const GRID_CLASSNAME =
  "grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4";

export function OverviewCards({ interval }: { interval: AnalyticsInterval }) {
  const { data, isLoading, isError } = useAnalyticsOverview(interval);

  if (isLoading) {
    return (
      <div className={GRID_CLASSNAME}>
        {["Total Requests", "Avg Latency", "Total Cost", "Error Rate"].map((label) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <Skeleton className="h-8 w-24" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 lg:px-6">
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          Failed to load analytics overview. Please try again later.
        </div>
      </div>
    );
  }

  const {
    total_requests = 0,
    avg_latency_ms = 0,
    total_cost_usd = 0,
    error_rate = 0,
  } = data?.overview ?? {};

  return (
    <div className={GRID_CLASSNAME}>
      <Card>
        <CardHeader>
          <CardDescription>Total Requests</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {total_requests.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Avg Latency</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {Math.round(avg_latency_ms)}ms
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Total Cost</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            ${total_cost_usd.toFixed(2)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Error Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {(error_rate * 100).toFixed(1)}%
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
