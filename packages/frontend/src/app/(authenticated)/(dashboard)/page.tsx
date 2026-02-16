"use client";

import { useLocalStorage } from "usehooks-ts";
import { SiteHeader } from "@/components/site-header";
import { OverviewCards } from "@/components/analytics/overview-cards";
import { TimeSeriesChart } from "@/components/analytics/timeseries-chart";
import { LatencyChart } from "@/components/analytics/latency-chart";
import { CostBreakdownChart } from "@/components/analytics/cost-breakdown-chart";
import { ErrorRateChart } from "@/components/analytics/error-rate-chart";
import { TokenBreakdownChart } from "@/components/analytics/token-breakdown-chart";
import type { AnalyticsInterval } from "@/lib/api/analytics";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DashboardPage() {
  const [interval, setInterval] = useLocalStorage<AnalyticsInterval>("analytics-interval", "1D", { initializeWithValue: false });

  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Interval selector — ToggleGroup on desktop, Select on mobile */}
            <div className="flex items-center justify-end px-4 lg:px-6">
              <ToggleGroup
                type="single"
                value={interval}
                onValueChange={(value) => value && setInterval(value as AnalyticsInterval)}
                variant="outline"
                className="hidden @[767px]/main:flex"
              >
                <ToggleGroupItem value="15M">Last 15 min</ToggleGroupItem>
                <ToggleGroupItem value="1H">Last hour</ToggleGroupItem>
                <ToggleGroupItem value="1D">Last 24h</ToggleGroupItem>
                <ToggleGroupItem value="7D">Last 7 days</ToggleGroupItem>
              </ToggleGroup>
              <Select value={interval} onValueChange={(value) => setInterval(value as AnalyticsInterval)}>
                <SelectTrigger className="w-40 @[767px]/main:hidden" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15M">Last 15 min</SelectItem>
                  <SelectItem value="1H">Last hour</SelectItem>
                  <SelectItem value="1D">Last 24h</SelectItem>
                  <SelectItem value="7D">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <OverviewCards interval={interval} />
            <div className="px-4 lg:px-6">
              <TimeSeriesChart interval={interval} />
            </div>
            <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
              <LatencyChart interval={interval} />
              <CostBreakdownChart interval={interval} />
            </div>
            <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
              <TokenBreakdownChart interval={interval} />
              <ErrorRateChart interval={interval} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
