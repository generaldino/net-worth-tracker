"use client";

import React, { useMemo } from "react";
import { filterChartDataByPeriod } from "./chart-shared";
import { NetWorthChart } from "./net-worth-chart";
import { NetWorthChangesChart } from "./net-worth-changes-chart";
import { AssetAllocationChart } from "./asset-allocation-chart";
import { IncomeSpendingChart } from "./income-spending-chart";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartCurrencyConverter } from "@/lib/chart-currency-converter";
import { useChartData } from "@/contexts/chart-data-context";
import type { Currency } from "@/lib/fx-rates";
import type { TimePeriod } from "@/lib/types";
import { useUrlState } from "@/hooks/use-url-state";
import { ChartErrorBoundary } from "./chart-error-boundary";

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
      <ChartErrorBoundary name="Net Worth Changes">
        <NetWorthChangesChart data={chartData} chartCurrency={chartCurrency} />
      </ChartErrorBoundary>
      <ChartErrorBoundary name="Asset Allocation">
        <AssetAllocationChart data={chartData} chartCurrency={chartCurrency} />
      </ChartErrorBoundary>
    </div>
  );
}
