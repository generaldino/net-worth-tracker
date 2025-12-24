"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { TimePeriod } from "@/lib/types";
import { ClickedData, ChartData, ChartType } from "@/components/charts/types";
import { ChartDisplay } from "@/components/charts/chart-display";
import { getChartData } from "@/lib/actions";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartCurrencyConverter } from "@/lib/chart-currency-converter";
import { useExchangeRates } from "@/contexts/exchange-rates-context";
import type { Currency } from "@/lib/fx-rates";
import { useProjection } from "@/contexts/projection-context";
import { calculateProjection } from "@/lib/actions";
import type { AccountType } from "@/lib/types";
import { AccountSelector } from "./controls/account-selector";
import { ChartTypeSelector } from "./controls/chart-type-selector";
import { ChartFilters } from "./controls/chart-filters";
import { AccountTypeSelector } from "./controls/account-type-selector";
import { CategorySelector } from "./controls/category-selector";
import { ProjectionCalculator } from "@/components/projections/projection-calculator";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

const accountCategories = ["Cash", "Investments"];

interface ProjectionScenario {
  id: string;
  name: string;
  monthlyIncome: number;
  savingsRate: number;
  timePeriodMonths: number;
  growthRates: Record<string, number>;
  savingsAllocation?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

interface ChartControlsProps {
  initialData: ChartData;
  owners: string[];
  scenarios: ProjectionScenario[];
  accountTypes: string[];
}

export function ChartControls({
  initialData,
  owners,
  scenarios,
  accountTypes,
}: ChartControlsProps) {
  const { getChartCurrency } = useDisplayCurrency();
  const { convertChartData } = useChartCurrencyConverter();
  const { fetchRates } = useExchangeRates();
  const { setProjectionData, setSelectedScenarioId } = useProjection();
  const [chartType, setChartType] = useState<ChartType>("total");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("1Y");
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

  // Allocation chart options
  const [allocationViewType, setAllocationViewType] = useState<
    "account-type" | "category"
  >("account-type");
  const [allocationSelectedMonth, setAllocationSelectedMonth] = useState<
    string | undefined
  >(undefined);

  // Total chart options (same as projection)
  const [totalViewType, setTotalViewType] = useState<"absolute" | "percentage">(
    "absolute"
  );

  // Projection chart options
  const [selectedProjectionScenario, setSelectedProjectionScenario] = useState<
    string | null
  >(null);
  const [projectionViewType, setProjectionViewType] = useState<
    "absolute" | "percentage"
  >("absolute");
  const [showProjectionForm, setShowProjectionForm] = useState(false); // Default to hidden

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

  // Client-side function to filter months by time period
  const getFilteredMonths = (
    months: string[],
    period: TimePeriod
  ): string[] => {
    if (months.length === 0) return months;

    // Get the latest month from the data (not current date)
    // months are sorted ascending (YYYY-MM format), so last is latest
    const latestMonth = months[months.length - 1];
    const [latestYear, latestMonthNum] = latestMonth.split("-").map(Number);
    // latestMonthNum is 1-indexed (1-12), Date constructor expects 0-indexed (0-11)

    switch (period) {
      case "1M": {
        // Go back 1 month from latest month
        const oneMonthAgo = new Date(latestYear, latestMonthNum - 2, 1);
        return months.filter((month) => new Date(month + "-01") >= oneMonthAgo);
      }
      case "3M": {
        // Go back 3 months from latest month
        const threeMonthsAgo = new Date(latestYear, latestMonthNum - 4, 1);
        return months.filter(
          (month) => new Date(month + "-01") >= threeMonthsAgo
        );
      }
      case "6M": {
        // Go back 6 months from latest month
        const sixMonthsAgo = new Date(latestYear, latestMonthNum - 7, 1);
        return months.filter(
          (month) => new Date(month + "-01") >= sixMonthsAgo
        );
      }
      case "1Y": {
        // Go back 12 months from latest month
        const oneYearAgo = new Date(latestYear, latestMonthNum - 13, 1);
        return months.filter((month) => new Date(month + "-01") >= oneYearAgo);
      }
      case "YTD":
        // Year to date from the latest month's year
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

    // Get all unique monthKeys from the data
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

    // Filter all data arrays by the filtered months
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
      // For base currency, convert to GBP
      return convertChartData(filteredChartDataByPeriod, "GBP");
    }
    return convertChartData(
      filteredChartDataByPeriod,
      chartCurrency as Currency
    );
  }, [filteredChartDataByPeriod, getChartCurrency, convertChartData]);

  // Update selected month to latest when view type changes or data updates
  useEffect(() => {
    const sourceData =
      allocationViewType === "category"
        ? chartData.categoryData
        : chartData.accountTypeData;
    const latestMonth =
      sourceData.length > 0
        ? sourceData[sourceData.length - 1]?.month
        : undefined;

    // Only update if current selection is invalid or not set
    if (
      !allocationSelectedMonth ||
      !sourceData.find((item) => item.month === allocationSelectedMonth)
    ) {
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
    [accountTypes]
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
        // Fetch raw data with "all" time period - time period filtering is done client-side
        const data = await getChartData(
          "all",
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

    // Check if filters (excluding timePeriod) differ from initial state
    // Time period filtering is now done client-side, so we don't need to refetch on timePeriod change
    const hasFiltersChanged =
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
    // Removed initialData and timePeriod from dependencies to prevent re-renders when parent re-renders
    // timePeriod is now handled client-side
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedOwner,
    selectedAccountsString,
    initialAccountsString,
    selectedTypesString,
    accountTypesString,
    selectedCategoriesString,
    accountCategoriesString,
  ]);

  return (
    <div className="w-full">
      <div className="pb-3 sm:pb-6">
        <div className="flex flex-col gap-3">
          <div
            className="flex gap-2 overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth touch-pan-x"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
              <div className="flex-shrink-0 min-w-[200px]">
                <ChartTypeSelector
                  value={chartType}
                  onChange={(value) => {
                    setChartType(value);
                    setClickedData(null);
                  }}
                  isLoading={isLoading}
                />
              </div>
              <div className="flex-shrink-0 min-w-[200px]">
                <AccountSelector
                  accounts={initialData.accounts}
                  selectedAccounts={selectedAccounts}
                  onAccountsChange={setSelectedAccounts}
                  isLoading={isLoading}
                />
              </div>
              <div className="flex-shrink-0 min-w-[180px]">
                <AccountTypeSelector
                  selectedTypes={selectedTypes}
                  onTypesChange={setSelectedTypes}
                  isLoading={isLoading}
                />
              </div>
              <div className="flex-shrink-0 min-w-[180px]">
                <CategorySelector
                  selectedCategories={selectedCategories}
                  onCategoriesChange={setSelectedCategories}
                  isLoading={isLoading}
                />
              </div>
              <div className="flex-shrink-0 min-w-[180px]">
                <ChartFilters
                  owners={owners}
                  selectedOwner={selectedOwner}
                  onOwnerChange={setSelectedOwner}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pt-0">
        <ChartDisplay
          chartType={chartType}
          chartData={chartData}
          clickedData={clickedData}
          setClickedData={setClickedData}
          isLoading={isLoading}
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
          projectionOptions={
            chartType === "projection"
              ? {
                  viewType: projectionViewType,
                  selectedScenario: selectedProjectionScenario,
                }
              : undefined
          }
          headerControls={
            chartType === "total" ? (
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
            ) : chartType === "projection" ? (
              <>
                <label className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm">
                  <span className="whitespace-nowrap">Scenario:</span>
                  <select
                    value={selectedProjectionScenario || ""}
                    onChange={async (e) => {
                      const scenarioId = e.target.value || null;
                      setSelectedProjectionScenario(scenarioId);

                      if (scenarioId) {
                        const scenario = scenarios.find(
                          (s) => s.id === scenarioId
                        );
                        if (scenario) {
                          setIsLoading(true);
                          try {
                            const assetAccountTypes: AccountType[] = [
                              "Current",
                              "Savings",
                              "Investment",
                              "Stock",
                              "Crypto",
                              "Pension",
                              "Commodity",
                              "Stock_options",
                            ];

                            const savingsAllocation =
                              scenario.savingsAllocation ||
                              (() => {
                                const defaults: Record<string, number> = {};
                                const types = Object.keys(
                                  scenario.growthRates
                                ).filter((type) =>
                                  assetAccountTypes.includes(
                                    type as AccountType
                                  )
                                ) as AccountType[];
                                if (types.length > 0) {
                                  const basePercent = Math.floor(
                                    100 / types.length
                                  );
                                  const remainder =
                                    100 - basePercent * types.length;
                                  types.forEach((type, index) => {
                                    defaults[type] =
                                      basePercent + (index < remainder ? 1 : 0);
                                  });
                                }
                                return defaults as Record<AccountType, number>;
                              })();

                            const result = await calculateProjection({
                              monthlyIncome: scenario.monthlyIncome,
                              savingsRate: scenario.savingsRate,
                              timePeriodMonths: scenario.timePeriodMonths,
                              growthRates: scenario.growthRates as Record<
                                AccountType,
                                number
                              >,
                              savingsAllocation,
                            });

                            setProjectionData(result);
                            setSelectedScenarioId(scenarioId);
                          } catch (error) {
                            console.error(
                              "Error calculating projection:",
                              error
                            );
                          } finally {
                            setIsLoading(false);
                          }
                        }
                      } else {
                        setProjectionData(null);
                        setSelectedScenarioId(null);
                      }
                    }}
                    className="px-2 py-1 rounded border bg-background min-w-[180px]"
                  >
                    <option value="">Select a scenario...</option>
                    {scenarios.map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm">
                  <span className="whitespace-nowrap">View:</span>
                  <select
                    value={projectionViewType}
                    onChange={(e) =>
                      setProjectionViewType(
                        e.target.value as "absolute" | "percentage"
                      )
                    }
                    className="px-2 py-1 rounded border bg-background min-w-[150px]"
                  >
                    <option value="absolute">Absolute Values</option>
                    <option value="percentage">Percentage Composition</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setShowProjectionForm(!showProjectionForm)}
                  className="flex-shrink-0 px-3 py-1 rounded border bg-background hover:bg-muted text-xs sm:text-sm whitespace-nowrap"
                >
                  {showProjectionForm ? "Hide" : "Show"} Setup Form
                </button>
              </>
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
            ) : null
          }
        />

        {/* Projection Setup Form - only show when projection chart type is selected */}
        {chartType === "projection" && (
          <Collapsible
            open={showProjectionForm}
            onOpenChange={setShowProjectionForm}
          >
            <CollapsibleContent className="mt-4">
              <div className="border-t pt-4">
                <ProjectionCalculator
                  initialScenarios={scenarios}
                  accountTypes={accountTypes}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
