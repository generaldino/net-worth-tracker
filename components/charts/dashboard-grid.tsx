"use client";

import React, { useMemo } from "react";
import type { ChartData } from "./types";
import { filterChartDataByPeriod } from "./chart-shared";
import { NetWorthChart } from "./net-worth-chart";
import { NetWorthChangesChart } from "./net-worth-changes-chart";
import { AssetAllocationChart } from "./asset-allocation-chart";
import { IncomeSpendingChart } from "./income-spending-chart";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartCurrencyConverter } from "@/lib/chart-currency-converter";
import type { Currency } from "@/lib/fx-rates";
import type { TimePeriod } from "@/lib/types";
import { useUrlState } from "@/hooks/use-url-state";
import { PeriodSelector } from "./period-selector";
import { ChartErrorBoundary } from "./chart-error-boundary";

interface DashboardGridProps {
  initialData: ChartData;
}

// Composes the 4 charts into a single grid. One period selector at the top
// drives every chart; each chart owns its own view-type state and isolates
// failures through a per-card error boundary.
export function DashboardGrid({ initialData }: DashboardGridProps) {
  const { getChartCurrency } = useDisplayCurrency();
  const { convertChartData } = useChartCurrencyConverter();
  const [period, setPeriod] = useUrlState<TimePeriod>("period", "1Y");

  // Convert currency and then filter by period, entirely client-side.
  const chartData = useMemo(() => {
    const currency = getChartCurrency();
    const converted = convertChartData(
      initialData,
      currency === "BASE" ? "GBP" : (currency as Currency)
    );
    return filterChartDataByPeriod(converted, period);
  }, [initialData, getChartCurrency, convertChartData, period]);

  const chartCurrency = (
    getChartCurrency() === "BASE" ? "GBP" : getChartCurrency()
  ) as Currency;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

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
        <ChartErrorBoundary name="Net Worth Changes">
          <NetWorthChangesChart
            data={chartData}
            chartCurrency={chartCurrency}
          />
        </ChartErrorBoundary>
        <ChartErrorBoundary name="Asset Allocation">
          <AssetAllocationChart
            data={chartData}
            chartCurrency={chartCurrency}
          />
        </ChartErrorBoundary>
      </div>
    </div>
  );
}
