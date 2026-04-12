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
import { RunwayFICard } from "./runway-fi-card";

// Recharts + d3 is ~200KB gzipped. Lazy-load each chart so it's fetched
// only when the dashboard actually renders, keeping the landing page and
// initial TTI lean.
const ChartSkeleton = () => (
  <div className="h-[240px] sm:h-[280px] w-full rounded-lg bg-muted/30 animate-pulse" />
);

const NetWorthChart = dynamic(
  () => import("./net-worth-chart").then((m) => m.NetWorthChart),
  { ssr: false, loading: ChartSkeleton }
);
const NetWorthChangesChart = dynamic(
  () =>
    import("./net-worth-changes-chart").then((m) => m.NetWorthChangesChart),
  { ssr: false, loading: ChartSkeleton }
);
const AssetAllocationChart = dynamic(
  () =>
    import("./asset-allocation-chart").then((m) => m.AssetAllocationChart),
  { ssr: false, loading: ChartSkeleton }
);
const IncomeSpendingChart = dynamic(
  () => import("./income-spending-chart").then((m) => m.IncomeSpendingChart),
  { ssr: false, loading: ChartSkeleton }
);

// Composes the 4 charts into a single grid. Reads chart data from the
// shared context and the period from URL state — both of which are also
// read by the navbar KPIs so a single `period` URL param drives everything.
export function DashboardGrid() {
  const rawData = useChartData();
  const { getChartCurrency } = useDisplayCurrency();
  const { convertChartData } = useChartCurrencyConverter();
  const [period] = useUrlState<TimePeriod>("period", "1Y");

  const chartData = useMemo(() => {
    if (!rawData) return null;
    const currency = getChartCurrency();
    const converted = convertChartData(
      rawData,
      currency === "BASE" ? "GBP" : (currency as Currency)
    );
    return filterChartDataByPeriod(converted, period);
  }, [rawData, getChartCurrency, convertChartData, period]);

  if (!chartData) return null;

  const chartCurrency = (
    getChartCurrency() === "BASE" ? "GBP" : getChartCurrency()
  ) as Currency;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="lg:col-span-2">
        <ChartErrorBoundary name="Net Worth">
          <NetWorthChart data={chartData} chartCurrency={chartCurrency} />
        </ChartErrorBoundary>
      </div>
      <div className="lg:col-span-2">
        <ChartErrorBoundary name="Income & Spending">
          <IncomeSpendingChart
            data={chartData}
            chartCurrency={chartCurrency}
          />
        </ChartErrorBoundary>
      </div>
      <ChartErrorBoundary name="Net Worth Changes (Monthly)">
        <NetWorthChangesChart
          data={chartData}
          chartCurrency={chartCurrency}
          viewType="monthly"
          title="Net Worth Changes (Monthly)"
        />
      </ChartErrorBoundary>
      <ChartErrorBoundary name="Net Worth Changes (Cumulative)">
        <NetWorthChangesChart
          data={chartData}
          chartCurrency={chartCurrency}
          viewType="cumulative"
          title="Net Worth Changes (Cumulative)"
        />
      </ChartErrorBoundary>
      <div className="lg:col-span-2">
        <ChartErrorBoundary name="Asset Allocation">
          <AssetAllocationChart
            data={chartData}
            chartCurrency={chartCurrency}
          />
        </ChartErrorBoundary>
      </div>
      <div className="lg:col-span-2">
        <ChartErrorBoundary name="Runway & Financial Independence">
          <RunwayFICard />
        </ChartErrorBoundary>
      </div>
    </div>
  );
}
