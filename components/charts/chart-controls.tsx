"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useTransition,
} from "react";
import type { TimePeriod } from "@/lib/types";
import { ClickedData, ChartData, ChartType } from "@/components/charts/types";
import { ChartDisplay } from "@/components/charts/chart-display";
import { getChartData } from "@/lib/actions";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartCurrencyConverter } from "@/lib/chart-currency-converter";
import type { Currency } from "@/lib/fx-rates";
import { ChartTypeSelector } from "./controls/chart-type-selector";
import { useUrlState } from "@/hooks/use-url-state";

const accountCategories = ["Cash", "Investments"];

interface ChartControlsProps {
  initialData: ChartData;
}

export function ChartControls({ initialData }: ChartControlsProps) {
  const { getChartCurrency } = useDisplayCurrency();
  const { convertChartData } = useChartCurrencyConverter();

  // useTransition for smooth chart type transitions (React 18 best practice)
  const [isPending, startTransition] = useTransition();

  // URL-based state for shareable chart views
  const validChartTypes: ChartType[] = [
    "total",
    "net-worth-changes",
    "income-spending",
    "allocation",
  ];
  const [rawChartType, setChartTypeUrl] = useUrlState<string>("chart", "total");
  const chartType: ChartType = validChartTypes.includes(rawChartType as ChartType)
    ? (rawChartType as ChartType)
    : "total";
  const [timePeriod, setTimePeriodUrl] = useUrlState<TimePeriod>("period", "1Y");

  const [clickedData, setClickedData] = useState<ClickedData | null>(null);
  const [rawChartData, setRawChartData] = useState<ChartData>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Hidden cards state - tracks which breakdown cards are hidden from the chart
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());

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
  const handleChartTypeChange = useCallback(
    (newChartType: ChartType) => {
      startTransition(() => {
        setChartTypeUrl(newChartType);
        setClickedData(null);
        setHiddenCards(new Set());
      });
    },
    [setChartTypeUrl, startTransition]
  );

  // Store initial data in a ref to prevent unnecessary re-renders
  const initialDataRef = useRef(initialData);

  // Allocation chart options
  const [allocationSelectedMonth, setAllocationSelectedMonth] = useState<
    string | undefined
  >(undefined);

  // Total chart options
  const [totalViewType, setTotalViewType] = useState<"absolute" | "percentage">(
    "absolute"
  );

  // Net worth changes chart options
  const [byWealthSourceViewType, setByWealthSourceViewType] = useState<
    "cumulative" | "monthly"
  >("monthly");

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

  // Filter chart data by time period client-side
  const filteredChartDataByPeriod = useMemo(() => {
    if (timePeriod === "all") {
      return rawChartData;
    }

    const allMonths = new Set<string>();
    rawChartData.netWorthData.forEach((item) => {
      if (item.monthKey) allMonths.add(item.monthKey);
    });
    rawChartData.accountData.forEach((item) => {
      if (item.monthKey) allMonths.add(item.monthKey);
    });
    rawChartData.accountTypeData.forEach((item) => {
      if (item.monthKey) allMonths.add(item.monthKey);
    });
    rawChartData.categoryData.forEach((item) => {
      if (item.monthKey) allMonths.add(item.monthKey);
    });
    rawChartData.sourceData.forEach((item) => {
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
        item.monthKey ? filteredMonths.has(item.monthKey) : true
      ),
      accountTypeData: rawChartData.accountTypeData.filter((item) =>
        item.monthKey ? filteredMonths.has(item.monthKey) : true
      ),
      categoryData: rawChartData.categoryData.filter((item) =>
        item.monthKey ? filteredMonths.has(item.monthKey) : true
      ),
      sourceData: rawChartData.sourceData.filter((item) =>
        item.monthKey ? filteredMonths.has(item.monthKey) : true
      ),
    };
  }, [rawChartData, timePeriod]);

  // Convert chart data client-side using stored rates
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

  // Update selected month to latest when data updates
  useEffect(() => {
    const sourceData = chartData.accountTypeData;
    const latestMonth =
      sourceData.length > 0
        ? sourceData[sourceData.length - 1]?.month
        : undefined;

    if (
      !allocationSelectedMonth ||
      !sourceData.find((item) => item.month === allocationSelectedMonth)
    ) {
      setAllocationSelectedMonth(latestMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData.accountTypeData]);

  // Always use all accounts, all types, all categories, and all owners (no filtering via UI)
  const selectedAccounts = useMemo(
    () => initialData.accounts.map((account) => account.id),
    [initialData.accounts]
  );
  const selectedOwner = "all";

  useEffect(() => {
    async function loadChartData() {
      setIsLoading(true);
      try {
        const data = await getChartData(
          "all",
          selectedOwner,
          selectedAccounts,
          [],
          accountCategories
        );
        setRawChartData(data);
        setClickedData(null);
      } catch (error) {
        console.error("Error loading chart data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    const hasFiltersChanged = false;

    if (hasFiltersChanged) {
      loadChartData();
    } else {
      setRawChartData((prev) => {
        if (prev.accounts.length === initialDataRef.current.accounts.length) {
          return prev;
        }
        return initialDataRef.current;
      });
      setClickedData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      <div className="pt-0">
        <ChartDisplay
          chartType={chartType}
          chartData={chartData}
          clickedData={clickedData}
          setClickedData={setClickedData}
          isLoading={isLoading || isPending}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriodUrl}
          allocationOptions={
            chartType === "allocation"
              ? {
                  viewType: "account-type",
                  selectedMonth: allocationSelectedMonth,
                }
              : undefined
          }
          totalOptions={
            chartType === "total" ? { viewType: totalViewType } : undefined
          }
          byWealthSourceOptions={
            chartType === "net-worth-changes"
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
                  isLoading={isLoading}
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
              ) : chartType === "net-worth-changes" ? (
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
              ) : chartType === "allocation" ? (
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
                    {chartData.accountTypeData.map((item) => (
                      <option key={item.monthKey} value={item.month}>
                        {item.month}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </>
          }
        />
      </div>
    </div>
  );
}
