"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TimePeriod } from "@/lib/types";
import { ClickedData, ChartData, ChartType } from "@/components/charts/types";
import { ChartDisplay } from "@/components/charts/chart-display";
import { getChartData } from "@/lib/actions";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartCurrencyConverter } from "@/lib/chart-currency-converter";
import { useExchangeRates } from "@/contexts/exchange-rates-context";
import type { Currency } from "@/lib/fx-rates";
import { AccountSelector } from "./controls/account-selector";
import { ChartTypeSelector } from "./controls/chart-type-selector";
import { ChartFilters } from "./controls/chart-filters";
import { AccountTypeSelector } from "./controls/account-type-selector";
import { CategorySelector } from "./controls/category-selector";
import { accountTypes } from "@/lib/types";

const accountCategories = ["Cash", "Investments"];

interface ChartControlsProps {
  initialData: ChartData;
  owners: string[];
}

export function ChartControls({ initialData, owners }: ChartControlsProps) {
  const { getChartCurrency } = useDisplayCurrency();
  const { convertChartData } = useChartCurrencyConverter();
  const { fetchRates } = useExchangeRates();
  const [chartType, setChartType] = useState<ChartType>("total");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [clickedData, setClickedData] = useState<ClickedData | null>(null);
  const [rawChartData, setRawChartData] = useState<ChartData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  
  // Store initial data in a ref to prevent unnecessary re-renders
  // This ref will only be set once on mount and won't trigger re-renders
  const initialDataRef = useRef(initialData);
  const initialAccountIdsRef = useRef<string[]>(
    initialData.accounts.map((account) => account.id)
  );
  
  // By Account chart options
  const [topN, setTopN] = useState<number | undefined>(undefined);
  
  // Allocation chart options
  const [allocationViewType, setAllocationViewType] = useState<"account-type" | "category">("account-type");
  const [allocationSelectedMonth, setAllocationSelectedMonth] = useState<string | undefined>(undefined);

  // Extract all unique months from chart data for rate fetching
  // Convert from "YYYY-MM-DD" to "YYYY-MM" format
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    const toMonthFormat = (monthKey: string): string => {
      if (/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
      if (/^\d{4}-\d{2}-\d{2}$/.test(monthKey)) return monthKey.substring(0, 7);
      return monthKey;
    };
    
    rawChartData.netWorthData.forEach((item) => {
      if (item.monthKey) months.add(toMonthFormat(item.monthKey));
    });
    rawChartData.accountData.forEach((item) => {
      if (item.monthKey) months.add(toMonthFormat(item.monthKey));
    });
    rawChartData.accountTypeData.forEach((item) => {
      if (item.monthKey) months.add(toMonthFormat(item.monthKey));
    });
    rawChartData.categoryData.forEach((item) => {
      if (item.monthKey) months.add(toMonthFormat(item.monthKey));
    });
    rawChartData.sourceData.forEach((item) => {
      if (item.monthKey) months.add(toMonthFormat(item.monthKey));
    });
    return Array.from(months);
  }, [rawChartData]);

  // Fetch rates when component mounts or currency changes
  useEffect(() => {
    const chartCurrency = getChartCurrency();
    if (chartCurrency !== "BASE" && uniqueMonths.length > 0) {
      fetchRates(uniqueMonths);
    }
  }, [getChartCurrency, uniqueMonths, fetchRates]);

  // Convert chart data client-side using stored rates
  const chartData = useMemo(() => {
    const chartCurrency = getChartCurrency();
    if (chartCurrency === "BASE") {
      // For base currency, convert to GBP
      return convertChartData(rawChartData, "GBP");
    }
    return convertChartData(rawChartData, chartCurrency as Currency);
  }, [rawChartData, getChartCurrency, convertChartData]);

  // Update selected month to latest when view type changes or data updates
  useEffect(() => {
    const sourceData = allocationViewType === "category" 
      ? chartData.categoryData 
      : chartData.accountTypeData;
    const latestMonth = sourceData.length > 0 ? sourceData[sourceData.length - 1]?.month : undefined;
    
    // Only update if current selection is invalid or not set
    if (!allocationSelectedMonth || !sourceData.find(item => item.month === allocationSelectedMonth)) {
      setAllocationSelectedMonth(latestMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocationViewType, chartData.categoryData, chartData.accountTypeData]);
  
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    initialData.accounts.map((account) => account.id)
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>(accountTypes);
  const [selectedCategories, setSelectedCategories] =
    useState<string[]>(accountCategories);

  // Memoize comparison values to prevent unnecessary re-renders
  const initialAccountsString = useMemo(
    () => [...initialAccountIdsRef.current].sort().join(","),
    []
  );
  const selectedAccountsString = useMemo(
    () => [...selectedAccounts].sort().join(","),
    [selectedAccounts]
  );
  const accountTypesString = useMemo(
    () => [...accountTypes].sort().join(","),
    []
  );
  const selectedTypesString = useMemo(
    () => [...selectedTypes].sort().join(","),
    [selectedTypes]
  );
  const accountCategoriesString = useMemo(
    () => [...accountCategories].sort().join(","),
    []
  );
  const selectedCategoriesString = useMemo(
    () => [...selectedCategories].sort().join(","),
    [selectedCategories]
  );

  useEffect(() => {
    async function loadChartData() {
      setIsLoading(true);
      try {
        // Fetch raw data (no currency conversion)
        const data = await getChartData(
          timePeriod,
          selectedOwner,
          selectedAccounts,
          selectedTypes,
          selectedCategories
        );
        setRawChartData(data);
        setClickedData(null);
      } catch (error) {
        console.error("Error loading chart data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    // Check if filters differ from initial state
    const hasFiltersChanged =
      timePeriod !== "all" ||
      selectedOwner !== "all" ||
      selectedAccountsString !== initialAccountsString ||
      selectedTypesString !== accountTypesString ||
      selectedCategoriesString !== accountCategoriesString;

    if (hasFiltersChanged) {
      loadChartData();
    } else {
      // Use initial data only if we haven't loaded filtered data yet
      // This prevents unnecessary state updates
      setRawChartData((prev) => {
        // If we already have data with the same account count, keep it
        if (prev.accounts.length === initialDataRef.current.accounts.length) {
          return prev;
        }
        return initialDataRef.current;
      });
      setClickedData(null);
    }
    // Removed initialData from dependencies to prevent re-renders when parent re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    timePeriod,
    selectedOwner,
    selectedAccountsString,
    initialAccountsString,
    selectedTypesString,
    accountTypesString,
    selectedCategoriesString,
    accountCategoriesString,
  ]);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
            <AccountSelector
              accounts={initialData.accounts}
              selectedAccounts={selectedAccounts}
              onAccountsChange={setSelectedAccounts}
              isLoading={isLoading}
            />
            <AccountTypeSelector
              selectedTypes={selectedTypes}
              onTypesChange={setSelectedTypes}
              isLoading={isLoading}
            />
            <CategorySelector
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              isLoading={isLoading}
            />
            <ChartFilters
              owners={owners}
              selectedOwner={selectedOwner}
              onOwnerChange={setSelectedOwner}
              timePeriod={timePeriod}
              onTimePeriodChange={setTimePeriod}
              isLoading={isLoading}
            />
            <ChartTypeSelector
              value={chartType}
              onChange={(value) => {
                setChartType(value);
                setClickedData(null);
              }}
              isLoading={isLoading}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Chart-specific options */}
        {(chartType === "by-account" || chartType === "allocation") && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg border flex flex-wrap gap-4 items-center text-sm">
            {chartType === "by-account" && (
              <label className="flex items-center gap-2">
                <span>Show top</span>
                <input
                  type="number"
                  min="1"
                  max={chartData.accounts.length}
                  value={topN || ""}
                  onChange={(e) => setTopN(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-16 px-2 py-1 rounded border bg-background"
                  placeholder="All"
                />
                <span>accounts</span>
              </label>
            )}
            {chartType === "allocation" && (
              <>
                <label className="flex items-center gap-2">
                  <span>View by:</span>
                  <select
                    value={allocationViewType}
                    onChange={(e) => setAllocationViewType(e.target.value as "account-type" | "category")}
                    className="px-2 py-1 rounded border bg-background"
                  >
                    <option value="account-type">Account Type</option>
                    <option value="category">Category</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span>Month:</span>
                  <select
                    value={allocationSelectedMonth || ""}
                    onChange={(e) => setAllocationSelectedMonth(e.target.value || undefined)}
                    className="px-2 py-1 rounded border bg-background min-w-[120px]"
                  >
                    <option value="">Latest</option>
                    {(allocationViewType === "category" ? chartData.categoryData : chartData.accountTypeData).map((item) => (
                      <option key={item.monthKey} value={item.month}>
                        {item.month}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
        )}
        <ChartDisplay
          chartType={chartType}
          chartData={chartData}
          clickedData={clickedData}
          setClickedData={setClickedData}
          isLoading={isLoading}
          byAccountOptions={
            chartType === "by-account"
              ? { topN }
              : undefined
          }
          allocationOptions={
            chartType === "allocation"
              ? { viewType: allocationViewType, selectedMonth: allocationSelectedMonth }
              : undefined
          }
        />
      </CardContent>
    </Card>
  );
}
