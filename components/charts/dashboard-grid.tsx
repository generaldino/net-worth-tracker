"use client";

import React, { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  filterChartDataByPeriod,
  filterChartDataByVisibility,
} from "./chart-shared";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartCurrencyConverter } from "@/lib/chart-currency-converter";
import { useChartData } from "@/contexts/chart-data-context";
import type { Currency } from "@/lib/fx-rates";
import type { TimePeriod } from "@/lib/types";
import { useUrlState } from "@/hooks/use-url-state";
import { ChartErrorBoundary } from "./chart-error-boundary";
import { WhyItChanged } from "./why-it-changed";
import { MixBars } from "./mix-bars";
import { AccountVisibilityFilter } from "./account-visibility-filter";
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
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
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

/** Comma-joined URL param ⇄ Set. Empty string means nothing hidden. */
function parseSetParam(param: string): Set<string> {
  return new Set(param.split(",").filter(Boolean));
}

function serializeSetParam(set: ReadonlySet<string>): string {
  return Array.from(set).sort().join(",");
}

/**
 * The home screen: one number, one trend, the mix, and why it changed.
 * A single `period` URL param drives the window; `hideTypes` /
 * `hideAccounts` params let you view the position without, say, the
 * pension — purely a view filter, nothing is modified.
 */
export function DashboardGrid() {
  const rawData = useChartData();
  const { getChartCurrency } = useDisplayCurrency();
  const { convertChartData } = useChartCurrencyConverter();
  const [period, setPeriod] = useUrlState<TimePeriod>("period", "1Y");
  const [hiddenTypesParam, setHiddenTypesParam] = useUrlState<string>(
    "hideTypes",
    "",
  );
  const [hiddenAccountsParam, setHiddenAccountsParam] = useUrlState<string>(
    "hideAccounts",
    "",
  );

  const hiddenTypes = useMemo(
    () => parseSetParam(hiddenTypesParam),
    [hiddenTypesParam],
  );
  const hiddenAccountIds = useMemo(
    () => parseSetParam(hiddenAccountsParam),
    [hiddenAccountsParam],
  );

  const toggleType = useCallback(
    (type: string) => {
      const next = new Set(hiddenTypes);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      setHiddenTypesParam(serializeSetParam(next));
    },
    [hiddenTypes, setHiddenTypesParam],
  );

  const toggleAccount = useCallback(
    (accountId: string) => {
      const next = new Set(hiddenAccountIds);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      setHiddenAccountsParam(serializeSetParam(next));
    },
    [hiddenAccountIds, setHiddenAccountsParam],
  );

  const resetVisibility = useCallback(() => {
    setHiddenTypesParam("");
    setHiddenAccountsParam("");
  }, [setHiddenTypesParam, setHiddenAccountsParam]);

  // Visibility first (so re-totalling sees raw balances), then currency
  // conversion, then the time window.
  const convertedAll = useMemo(() => {
    if (!rawData) return null;
    const visible = filterChartDataByVisibility(
      rawData,
      hiddenTypes,
      hiddenAccountIds,
    );
    const currency = getChartCurrency();
    return convertChartData(
      visible,
      currency === "BASE" ? "GBP" : (currency as Currency),
    );
  }, [rawData, hiddenTypes, hiddenAccountIds, getChartCurrency, convertChartData]);

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

  if (!chartData || !rawData) return null;

  const chartCurrency = (
    getChartCurrency() === "BASE" ? "GBP" : getChartCurrency()
  ) as Currency;

  const isFiltered = hiddenTypes.size > 0 || hiddenAccountIds.size > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AccountVisibilityFilter
          accounts={rawData.accounts}
          hiddenTypes={hiddenTypes}
          hiddenAccountIds={hiddenAccountIds}
          onToggleType={toggleType}
          onToggleAccount={toggleAccount}
          onReset={resetVisibility}
        />
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
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3",
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
            isFiltered={isFiltered}
          />
        </ChartErrorBoundary>
        <ChartErrorBoundary name="Your mix">
          <MixBars data={chartData} chartCurrency={chartCurrency} />
        </ChartErrorBoundary>
      </div>
    </div>
  );
}
