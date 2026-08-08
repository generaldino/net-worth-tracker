"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { filterChartDataByPeriod } from "./chart-shared";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartCurrencyConverter } from "@/lib/chart-currency-converter";
import { useChartData } from "@/contexts/chart-data-context";
import type { Currency } from "@/lib/fx-rates";
import type { TimePeriod } from "@/lib/types";
import { useUrlState } from "@/hooks/use-url-state";
import { ChartErrorBoundary } from "./chart-error-boundary";
import { WhyItChanged } from "./why-it-changed";
import { MixBars } from "./mix-bars";
import { cn } from "@/lib/utils";
import type { NetWorthDelta } from "./net-worth-chart";

// Recharts + d3 is ~200KB gzipped. Lazy-load the chart so it's fetched
// only when the dashboard actually renders.
const ChartSkeleton = () => (
  <div className="h-[240px] sm:h-[280px] w-full rounded-lg bg-muted/30 animate-pulse" />
);

const NetWorthChart = dynamic(
  () => import("./net-worth-chart").then((m) => m.NetWorthChart),
  { ssr: false, loading: ChartSkeleton },
);

const PERIOD_OPTIONS: Array<{ value: TimePeriod; label: string }> = [
  { value: "1Y", label: "1Y" },
  { value: "all", label: "All" },
];

function periodLabel(period: TimePeriod): string {
  switch (period) {
    case "1Y":
      return "last 12 months";
    case "all":
      return "all time";
    case "YTD":
      return "this year";
    case "6M":
      return "last 6 months";
    case "3M":
      return "last 3 months";
    case "1M":
      return "last month";
    default:
      return "";
  }
}

/**
 * The home screen: one number, one trend, the mix, and why it changed.
 * Everything reads the shared chart dataset; a single `period` URL param
 * drives all of it.
 */
export function DashboardGrid() {
  const rawData = useChartData();
  const { getChartCurrency } = useDisplayCurrency();
  const { convertChartData } = useChartCurrencyConverter();
  const [period, setPeriod] = useUrlState<TimePeriod>("period", "1Y");

  const convertedAll = useMemo(() => {
    if (!rawData) return null;
    const currency = getChartCurrency();
    return convertChartData(
      rawData,
      currency === "BASE" ? "GBP" : (currency as Currency),
    );
  }, [rawData, getChartCurrency, convertChartData]);

  const chartData = useMemo(() => {
    if (!convertedAll) return null;
    return filterChartDataByPeriod(convertedAll, period);
  }, [convertedAll, period]);

  // Deltas always compare against the full history, not the filtered window.
  const deltas = useMemo<NetWorthDelta[]>(() => {
    if (!convertedAll) return [];
    const points = convertedAll.netWorthData;
    if (points.length < 2) return [];
    const latest = points[points.length - 1];
    const result: NetWorthDelta[] = [];

    const prev = points[points.length - 2];
    result.push({
      label: "vs last month",
      abs: latest.netWorth - prev.netWorth,
      pct:
        prev.netWorth !== 0
          ? ((latest.netWorth - prev.netWorth) / Math.abs(prev.netWorth)) * 100
          : null,
    });

    if (points.length >= 13) {
      const yearAgo = points[points.length - 13];
      result.push({
        label: "vs a year ago",
        abs: latest.netWorth - yearAgo.netWorth,
        pct:
          yearAgo.netWorth !== 0
            ? ((latest.netWorth - yearAgo.netWorth) /
                Math.abs(yearAgo.netWorth)) *
              100
            : null,
      });
    }
    return result;
  }, [convertedAll]);

  if (!chartData) return null;

  const chartCurrency = (
    getChartCurrency() === "BASE" ? "GBP" : getChartCurrency()
  ) as Currency;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div
          className="inline-flex items-center rounded-lg border p-0.5"
          role="group"
          aria-label="Time period"
        >
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              aria-pressed={period === option.value}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                period === option.value
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ChartErrorBoundary name="Net Worth">
        <NetWorthChart
          data={chartData}
          chartCurrency={chartCurrency}
          deltas={deltas}
        />
      </ChartErrorBoundary>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartErrorBoundary name="Why it changed">
          <WhyItChanged
            data={chartData}
            chartCurrency={chartCurrency}
            periodLabel={periodLabel(period)}
          />
        </ChartErrorBoundary>
        <ChartErrorBoundary name="Your mix">
          <MixBars data={chartData} chartCurrency={chartCurrency} />
        </ChartErrorBoundary>
      </div>
    </div>
  );
}
