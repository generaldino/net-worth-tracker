"use client";

import React, { useState, useMemo, useCallback, useTransition } from "react";
import type { TimePeriod } from "@/lib/types";
import { ClickedData, ChartType } from "@/components/charts/types";
import { ChartDisplay } from "@/components/charts/chart-display";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartCurrencyConverter } from "@/lib/chart-currency-converter";
import type { Currency } from "@/lib/fx-rates";
import { ChartTypeSelector } from "@/components/charts/controls/chart-type-selector";
import { getDemoChartData } from "@/lib/demo-data";

export function DemoChartSection() {
  const { getChartCurrency } = useDisplayCurrency();
  const { convertChartData } = useChartCurrencyConverter();

  // useTransition for smooth chart type transitions (React 18 best practice)
  const [isPending, startTransition] = useTransition();

  const [chartType, setChartType] = useState<ChartType>("total");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("1Y");
  const [clickedData, setClickedData] = useState<ClickedData | null>(null);
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());

  // Get demo data
  const rawChartData = useMemo(() => getDemoChartData(), []);

  // Toggle a card's visibility
  const handleToggleHidden = useCallback((cardName: string) => {
    setHiddenCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardName)) {
        next.delete(cardName);
      } else {
        next.add(cardName);
      }
      return next;
    });
  }, []);

  // Clear hidden cards when chart type changes
  // Uses useTransition for smooth loading state during chart type switch
  const handleChartTypeChange = useCallback((newChartType: ChartType) => {
    startTransition(() => {
      setChartType(newChartType);
      setClickedData(null);
      setHiddenCards(new Set());
    });
  }, [startTransition]);

  // Allocation chart options
  const [allocationViewType, setAllocationViewType] = useState<
    "account-type" | "category"
  >("account-type");
  const [allocationSelectedMonth, setAllocationSelectedMonth] = useState<
    string | undefined
  >(undefined);

  // Total chart options
  const [totalViewType, setTotalViewType] = useState<"absolute" | "percentage">(
    "absolute"
  );

  // By wealth source chart options
  const [byWealthSourceViewType, setByWealthSourceViewType] = useState<
    "cumulative" | "monthly"
  >("cumulative");

  // Client-side function to filter months by time period
  const getFilteredMonths = (
    months: string[],
    period: TimePeriod
  ): string[] => {
    if (months.length === 0) return months;

    const latestMonth = months[months.length - 1];
    const [latestYear, latestMonthNum] = latestMonth.split("-").map(Number);

    switch (period) {
      case "1M": {
        const oneMonthAgo = new Date(latestYear, latestMonthNum - 2, 1);
        return months.filter((month) => new Date(month + "-01") >= oneMonthAgo);
      }
      case "3M": {
        const threeMonthsAgo = new Date(latestYear, latestMonthNum - 4, 1);
        return months.filter(
          (month) => new Date(month + "-01") >= threeMonthsAgo
        );
      }
      case "6M": {
        const sixMonthsAgo = new Date(latestYear, latestMonthNum - 7, 1);
        return months.filter(
          (month) => new Date(month + "-01") >= sixMonthsAgo
        );
      }
      case "1Y": {
        const oneYearAgo = new Date(latestYear, latestMonthNum - 13, 1);
        return months.filter((month) => new Date(month + "-01") >= oneYearAgo);
      }
      case "YTD":
        return months.filter((month) =>
          month.startsWith(latestYear.toString())
        );
      case "all":
      default:
        return months;
    }
  };

  // Filter chart data by time period
  const filteredChartDataByPeriod = useMemo(() => {
    if (timePeriod === "all") {
      return rawChartData;
    }

    const allMonths = new Set<string>();
    rawChartData.netWorthData.forEach((item) => {
      if (item.monthKey) allMonths.add(item.monthKey);
    });

    const sortedMonths = Array.from(allMonths).sort();
    const filteredMonths = new Set(getFilteredMonths(sortedMonths, timePeriod));

    return {
      ...rawChartData,
      netWorthData: rawChartData.netWorthData.filter((item) =>
        item.monthKey ? filteredMonths.has(item.monthKey) : true
      ),
      accountData: rawChartData.accountData.filter((item) =>
        item.monthKey ? filteredMonths.has(item.monthKey as string) : true
      ),
      accountTypeData: rawChartData.accountTypeData.filter((item) =>
        item.monthKey ? filteredMonths.has(item.monthKey as string) : true
      ),
      categoryData: rawChartData.categoryData.filter((item) =>
        item.monthKey ? filteredMonths.has(item.monthKey as string) : true
      ),
      sourceData: rawChartData.sourceData.filter((item) =>
        item.monthKey ? filteredMonths.has(item.monthKey) : true
      ),
    };
  }, [rawChartData, timePeriod]);

  // Convert chart data client-side
  const chartData = useMemo(() => {
    const chartCurrency = getChartCurrency();
    if (chartCurrency === "BASE") {
      return convertChartData(filteredChartDataByPeriod, "GBP");
    }
    return convertChartData(
      filteredChartDataByPeriod,
      chartCurrency as Currency
    );
  }, [filteredChartDataByPeriod, getChartCurrency, convertChartData]);

  return (
    <div className="w-full">
      <div className="pt-0">
        <ChartDisplay
          chartType={chartType}
          chartData={chartData}
          clickedData={clickedData}
          setClickedData={setClickedData}
          isLoading={isPending}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          allocationOptions={
            chartType === "allocation"
              ? {
                  viewType: allocationViewType,
                  selectedMonth: allocationSelectedMonth,
                }
              : undefined
          }
          totalOptions={
            chartType === "total" ? { viewType: totalViewType } : undefined
          }
          byWealthSourceOptions={
            chartType === "by-wealth-source"
              ? { viewType: byWealthSourceViewType }
              : undefined
          }
          hiddenCards={hiddenCards}
          onToggleHidden={handleToggleHidden}
          headerControls={
            <>
              <div className="flex-shrink-0 min-w-[200px]">
                <ChartTypeSelector
                  value={chartType}
                  onChange={handleChartTypeChange}
                  isLoading={false}
                />
              </div>
              {chartType === "total" ? (
                <label className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm">
                  <span className="whitespace-nowrap">View:</span>
                  <select
                    value={totalViewType}
                    onChange={(e) =>
                      setTotalViewType(
                        e.target.value as "absolute" | "percentage"
                      )
                    }
                    className="px-2 py-1 rounded border bg-background min-w-[150px]"
                  >
                    <option value="absolute">Absolute Values</option>
                    <option value="percentage">Percentage Composition</option>
                  </select>
                </label>
              ) : chartType === "by-wealth-source" ? (
                <label className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm">
                  <span className="whitespace-nowrap">View:</span>
                  <select
                    value={byWealthSourceViewType}
                    onChange={(e) =>
                      setByWealthSourceViewType(
                        e.target.value as "cumulative" | "monthly"
                      )
                    }
                    className="px-2 py-1 rounded border bg-background min-w-[150px]"
                  >
                    <option value="cumulative">Cumulative</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
              ) : chartType === "projection" ? (
                <div className="text-sm text-muted-foreground italic">
                  Projections not available in demo mode
                </div>
              ) : chartType === "allocation" ? (
                <>
                  <label className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm">
                    <span className="whitespace-nowrap">View by:</span>
                    <select
                      value={allocationViewType}
                      onChange={(e) =>
                        setAllocationViewType(
                          e.target.value as "account-type" | "category"
                        )
                      }
                      className="px-2 py-1 rounded border bg-background min-w-[140px]"
                    >
                      <option value="account-type">Account Type</option>
                      <option value="category">Category</option>
                    </select>
                  </label>
                  <label className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm">
                    <span className="whitespace-nowrap">Month:</span>
                    <select
                      value={allocationSelectedMonth || ""}
                      onChange={(e) =>
                        setAllocationSelectedMonth(e.target.value || undefined)
                      }
                      className="px-2 py-1 rounded border bg-background min-w-[120px]"
                    >
                      <option value="">Latest</option>
                      {(allocationViewType === "category"
                        ? chartData.categoryData
                        : chartData.accountTypeData
                      ).map((item) => (
                        <option key={item.monthKey} value={item.month}>
                          {item.month}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
            </>
          }
        />
      </div>
    </div>
  );
}
