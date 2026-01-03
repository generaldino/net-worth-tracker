"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import type { TimePeriod } from "@/lib/types";
import { ClickedData, ChartData, ChartType } from "@/components/charts/types";
import { ChartDisplay } from "@/components/charts/chart-display";
import { getChartData } from "@/lib/actions";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartCurrencyConverter } from "@/lib/chart-currency-converter";
import type { Currency } from "@/lib/fx-rates";
import { useProjection } from "@/contexts/projection-context";
import { calculateProjection } from "@/lib/actions";
import type { AccountType } from "@/lib/types";
import { ChartTypeSelector } from "./controls/chart-type-selector";
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
  scenarios: ProjectionScenario[];
  accountTypes: string[];
}

export function ChartControls({
  initialData,
  scenarios,
  accountTypes,
}: ChartControlsProps) {
  const { getChartCurrency } = useDisplayCurrency();
  const { convertChartData } = useChartCurrencyConverter();
  const { setProjectionData, setSelectedScenarioId } = useProjection();
  const [chartType, setChartType] = useState<ChartType>("total");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("1Y");
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
  const handleChartTypeChange = useCallback((newChartType: ChartType) => {
    setChartType(newChartType);
    setClickedData(null);
    setHiddenCards(new Set()); // Reset hidden cards when switching chart type
    // Clear projection scenario when switching away from projection chart
    if (newChartType !== "projection") {
      setProjectionData(null);
      setSelectedScenarioId(null);
    }
  }, [setProjectionData, setSelectedScenarioId]);

  // Store initial data in a ref to prevent unnecessary re-renders
  // This ref will only be set once on mount and won't trigger re-renders
  const initialDataRef = useRef(initialData);
  // Track if we've preloaded the first scenario to avoid duplicate loads
  const hasPreloadedRef = useRef(false);

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

  // By wealth source chart options
  const [byWealthSourceViewType, setByWealthSourceViewType] = useState<
    "cumulative" | "monthly"
  >("cumulative");

  // Projection chart options
  const [selectedProjectionScenario, setSelectedProjectionScenario] = useState<
    string | null
  >(null);
  const [projectionViewType, setProjectionViewType] = useState<
    "absolute" | "percentage"
  >("absolute");
  const [showProjectionForm, setShowProjectionForm] = useState(false); // Default to hidden

  // Helper function to calculate projection for a scenario
  const calculateProjectionForScenario = useCallback(
    async (scenario: ProjectionScenario, scenarioId: string) => {
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
          const types = Object.keys(scenario.growthRates).filter((type) =>
            assetAccountTypes.includes(type as AccountType)
          ) as AccountType[];
          if (types.length > 0) {
            const basePercent = Math.floor(100 / types.length);
            const remainder = 100 - basePercent * types.length;
            types.forEach((type, index) => {
              defaults[type] = basePercent + (index < remainder ? 1 : 0);
            });
          }
          return defaults as Record<AccountType, number>;
        })();

      const result = await calculateProjection({
        monthlyIncome: scenario.monthlyIncome,
        savingsRate: scenario.savingsRate,
        timePeriodMonths: scenario.timePeriodMonths,
        growthRates: scenario.growthRates as Record<AccountType, number>,
        savingsAllocation,
      });

      // Check for error in response (error field is optional and only present on errors)
      if (result && "error" in result && result.error) {
        console.error("Error calculating projection:", result.error);
        return false;
      } else {
        // Type assertion needed since error field is optional
        setProjectionData(result as Parameters<typeof setProjectionData>[0]);
        setSelectedScenarioId(scenarioId);
        return true;
      }
    },
    [setProjectionData, setSelectedScenarioId]
  );

  // Preload first scenario projection data on mount to make switching instant
  useEffect(() => {
    if (scenarios.length > 0 && !hasPreloadedRef.current) {
      hasPreloadedRef.current = true;
      const firstScenarioId = scenarios[0].id;
      const firstScenario = scenarios[0];

      // Preload in background without blocking UI
      calculateProjectionForScenario(firstScenario, firstScenarioId).catch(
        (error: unknown) => {
          console.error("Error preloading projection:", error);
        }
      );

      // Also set the selected scenario ID so it's ready
      setSelectedProjectionScenario(firstScenarioId);
    }
  }, [
    scenarios,
    calculateProjectionForScenario,
    setSelectedProjectionScenario,
  ]);

  // Auto-select first scenario when projection chart is selected (if not already selected)
  useEffect(() => {
    if (
      chartType === "projection" &&
      scenarios.length > 0 &&
      !selectedProjectionScenario
    ) {
      const firstScenarioId = scenarios[0].id;
      setSelectedProjectionScenario(firstScenarioId);

      // Trigger calculation for first scenario
      const scenario = scenarios[0];
      if (scenario) {
        setIsLoading(true);
        calculateProjectionForScenario(scenario, firstScenarioId)
          .catch((error: unknown) => {
            console.error("Error calculating projection:", error);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }
  }, [
    chartType,
    scenarios,
    selectedProjectionScenario,
    setProjectionData,
    setSelectedScenarioId,
    calculateProjectionForScenario,
  ]);

  // Rates are now pre-fetched server-side and passed to ExchangeRatesProvider
  // No useEffect needed for initial rate fetching!

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

  // Always use all accounts, all types, all categories, and all owners (no filtering via UI)
  const selectedAccounts = useMemo(
    () => initialData.accounts.map((account) => account.id),
    [initialData.accounts]
  );
  const selectedTypes = useMemo(() => accountTypes, [accountTypes]);
  const selectedCategories = useMemo(() => accountCategories, []);
  const selectedOwner = "all";

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

    // Since we always use all accounts, types, categories, and owners, filters never change
    // Time period filtering is now done client-side, so we don't need to refetch on timePeriod change
    const hasFiltersChanged = false;

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
    // No dependencies needed since filters never change
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
                  onChange={(value) => {
                    handleChartTypeChange(value);
                    // Clear projection scenario when switching away from projection chart
                    if (value !== "projection") {
                      setSelectedProjectionScenario(null);
                    }
                  }}
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
                <React.Fragment>
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
                            calculateProjectionForScenario(scenario, scenarioId)
                              .catch((error: unknown) => {
                                console.error(
                                  "Error calculating projection:",
                                  error
                                );
                              })
                              .finally(() => {
                                setIsLoading(false);
                              });
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
                </React.Fragment>
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
