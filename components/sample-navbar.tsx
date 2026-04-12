"use client";

import { useMemo } from "react";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartData } from "@/contexts/chart-data-context";
import { useMasking } from "@/contexts/masking-context";
import { useChartCurrencyConverter } from "@/lib/chart-currency-converter";
import { useUrlState } from "@/hooks/use-url-state";
import { filterChartDataByPeriod } from "@/components/charts/chart-shared";
import type { Currency } from "@/lib/fx-rates";
import { getCurrencySymbol } from "@/lib/fx-rates";
import type { TimePeriod } from "@/lib/types";

// Headline KPIs shown in the sticky navbar. Reads the full chart dataset
// from ChartDataContext and recomputes Net Worth / Earned / Spent / Saved
// for whatever period the user selects — the same URL param that the
// dashboard grid uses to filter its charts.
export function FinancialMetricsNavbar() {
  const chartData = useChartData();
  const { displayCurrency } = useDisplayCurrency();
  const { convertChartData } = useChartCurrencyConverter();
  const { isMasked } = useMasking();
  const [period] = useUrlState<TimePeriod>("period", "1Y");

  const targetCurrency = (
    displayCurrency === "BASE" ? "GBP" : displayCurrency
  ) as Currency;

  const metrics = useMemo(() => {
    if (!chartData) return null;
    const converted = convertChartData(chartData, targetCurrency);
    const filtered = filterChartDataByPeriod(converted, period);

    const netWorth =
      filtered.netWorthData.length > 0
        ? filtered.netWorthData[filtered.netWorthData.length - 1].netWorth
        : 0;
    const netWorthStart =
      filtered.netWorthData.length > 0
        ? filtered.netWorthData[0].netWorth
        : 0;
    const netWorthChange =
      netWorthStart !== 0
        ? ((netWorth - netWorthStart) / Math.abs(netWorthStart)) * 100
        : null;

    const earned = filtered.sourceData.reduce(
      (sum, m) => sum + ((m["Total Income"] as number) || 0),
      0
    );
    const spent = filtered.sourceData.reduce(
      (sum, m) => sum + Math.abs((m["Total Expenditure"] as number) || 0),
      0
    );
    const saved = earned - spent;
    const savingsRate = earned > 0 ? (saved / earned) * 100 : null;
    const spendingRate = earned > 0 ? (spent / earned) * 100 : null;

    return {
      netWorth,
      netWorthChange,
      earned,
      spent,
      saved,
      savingsRate,
      spendingRate,
    };
  }, [chartData, targetCurrency, period, convertChartData]);

  if (!metrics) return null;

  const symbol = getCurrencySymbol(targetCurrency);

  const formatCompact = (value: number) => {
    if (isMasked) return "••••";
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatSignedPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const entries: Array<{
    label: string;
    value: number;
    badge?: string;
    badgeTone?: "muted" | "green" | "red";
    color: "green" | "red" | "neutral";
  }> = [
    {
      label: "Net Worth",
      value: metrics.netWorth,
      badge:
        metrics.netWorthChange !== null
          ? formatSignedPercent(metrics.netWorthChange)
          : undefined,
      badgeTone:
        metrics.netWorthChange !== null && metrics.netWorthChange >= 0
          ? "green"
          : "red",
      color: "neutral",
    },
    { label: "Earned", value: metrics.earned, color: "neutral" },
    {
      label: "Spent",
      value: metrics.spent,
      badge:
        metrics.spendingRate !== null
          ? `${Math.round(metrics.spendingRate)}% of income`
          : undefined,
      badgeTone: "muted",
      color: "neutral",
    },
    {
      label: "Saved",
      value: metrics.saved,
      badge:
        metrics.savingsRate !== null
          ? `${Math.round(metrics.savingsRate)}% of income`
          : undefined,
      badgeTone: "muted",
      color: metrics.saved >= 0 ? "green" : "red",
    },
  ];

  return (
    <div className="flex items-center gap-4 overflow-x-auto sm:gap-6">
      {entries.map((metric, index) => (
        <div key={metric.label} className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                {metric.label}
              </span>
              {metric.badge && (
                <span
                  className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold font-mono tabular-nums ${
                    metric.badgeTone === "green"
                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : metric.badgeTone === "red"
                      ? "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {metric.badge}
                </span>
              )}
            </div>
            <span
              className={`whitespace-nowrap text-base font-bold tabular-nums sm:text-lg ${
                metric.color === "red"
                  ? "text-red-600"
                  : metric.color === "green"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground"
              }`}
            >
              {symbol}
              {formatCompact(metric.value)}
            </span>
          </div>
          {index < entries.length - 1 && (
            <div className="h-8 w-px bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}
