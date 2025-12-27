"use client";

import React from "react";
import { ChartType } from "@/components/charts/types";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { useMemo } from "react";
import { COLORS, CHART_GREEN, CHART_RED, getUniqueColor } from "./constants";
import { NetWorthCards } from "@/components/sample-card";

// Account type ordering hierarchy for consistent sorting
const ACCOUNT_TYPE_ORDER: Record<string, number> = {
  // Cash accounts (priority 0-9)
  Current: 0,
  Savings: 1,
  // Investment accounts (priority 10-19)
  Investment: 10,
  Stock: 11,
  Crypto: 12,
  Commodity: 13,
  Stock_options: 14,
  // Retirement accounts (priority 20-29)
  Pension: 20,
  // Liabilities (priority 30-39)
  Credit_Card: 30,
  Loan: 31,
};

// Helper to get account type priority for sorting
function getAccountTypePriority(type: string): number {
  return ACCOUNT_TYPE_ORDER[type] ?? 999; // Unknown types go last
}

// Helper to sort account types by hierarchy, then by value
function sortAccountTypesByHierarchy<
  T extends { name: string; absValue: number }
>(items: T[]): T[] {
  return items.sort((a, b) => {
    const priorityA = getAccountTypePriority(a.name);
    const priorityB = getAccountTypePriority(b.name);

    // First sort by category priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Within same category, sort by absolute value descending
    return b.absValue - a.absValue;
  });
}

interface ChartHeaderProps {
  chartType: ChartType;
  hoveredData: HoveredData | null;
  latestData: HoveredData | null;
  chartCurrency: Currency;
  totalOptions?: {
    viewType?: "absolute" | "percentage";
  };
  projectionOptions?: {
    viewType?: "absolute" | "percentage";
    selectedScenario?: string | null;
  };
  headerControls?: React.ReactNode;
  hoveredCardName?: string | null;
  onCardHover?: (cardName: string | null) => void;
}

export interface HoveredData {
  date: string;
  month: string;
  primaryValue?: number;
  metrics?: Record<string, number | string>;
}

export function ChartHeader({
  chartType,
  hoveredData,
  latestData,
  chartCurrency,
  totalOptions,
  projectionOptions,
  headerControls,
  hoveredCardName,
  onCardHover,
}: ChartHeaderProps) {
  const { isMasked } = useMasking();
  const displayData = hoveredData || latestData;

  // Extract account types for total and projection charts - must be called before early return
  const accountTypesForTotal = useMemo(() => {
    if (chartType !== "total" || !displayData?.metrics) return [];

    const items = Object.entries(displayData.metrics)
      .filter(([key]) => key !== "Net Worth")
      .map(([key, value]) => ({
        name: key,
        value: value as number,
        absValue: Math.abs(value as number),
      }))
      .filter((item) => item.absValue > 0); // Only show non-zero values

    // Sort by account type hierarchy, then by value within category
    return sortAccountTypesByHierarchy(items).slice(0, 8); // Show top 8 account types
  }, [chartType, displayData]);

  const accountTypesForProjection = useMemo(() => {
    if (chartType !== "projection" || !displayData?.metrics) return [];

    const items = Object.entries(displayData.metrics)
      .filter(([key]) => key !== "Net Worth")
      .map(([key, value]) => ({
        name: key,
        value: value as number,
        absValue: Math.abs(value as number),
      }))
      .filter((item) => item.absValue > 0); // Only show non-zero values

    // Sort by account type hierarchy, then by value within category
    return sortAccountTypesByHierarchy(items).slice(0, 8); // Show top 8 account types
  }, [chartType, displayData]);

  // Early return after all hooks - but still render headerControls even if no data
  if (!displayData) {
    // Still render header controls even when there's no data (e.g., for scenario selection)
    return (
      <div className="mb-4 w-full">
        {/* Primary metrics - empty space to maintain consistent layout */}
        <div className="w-full min-h-[60px]"></div>

        {/* Header Controls - inline and scrollable with fixed min-height to prevent layout shifts */}
        <div
          className="w-full mt-3 min-h-[40px] overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth touch-pan-x"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {headerControls && (
            <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
              {headerControls}
            </div>
          )}
        </div>
      </div>
    );
  }

  const formatValue = (value: number | undefined): string => {
    if (value === undefined) return "—";
    return isMasked ? "••••••" : formatCurrencyAmount(value, chartCurrency);
  };

  const formatPercentage = (
    value: number | undefined,
    decimals: number = 1
  ): string => {
    if (value === undefined) return "—";
    return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
  };

  // Helper function to get color for a metric based on chart type
  const getMetricColor = (
    chartType: ChartType,
    metricName: string,
    index?: number,
    allMetricNames?: string[]
  ): string => {
    switch (chartType) {
      case "assets-vs-liabilities":
        if (metricName === "Assets") return CHART_GREEN;
        if (metricName === "Liabilities") return CHART_RED;
        return "";
      case "by-wealth-source":
        if (metricName === "Savings from Income") return COLORS[0];
        if (metricName === "Interest Earned") return COLORS[1];
        if (metricName === "Capital Gains") return COLORS[2];
        return "";
      case "waterfall":
        if (metricName === "Starting Balance") return "hsl(var(--chart-4))";
        if (metricName === "Savings from Income") return COLORS[0];
        if (metricName === "Interest Earned") return COLORS[1];
        if (metricName === "Capital Gains") return COLORS[2];
        if (metricName === "Net Change") return "hsl(var(--chart-1))";
        return "";
      case "savings-rate":
        if (metricName === "Savings Rate") return CHART_GREEN;
        if (metricName === "Total Income") return COLORS[0];
        if (metricName === "Total Expenditure") return CHART_RED;
        if (metricName === "Savings from Income") return COLORS[1];
        return "";
      case "total":
      case "projection":
        // For account types, colors are assigned based on alphabetical order in the chart
        // So we need to find the alphabetical index of this account type
        if (allMetricNames && allMetricNames.length > 0) {
          // Create a sorted copy to get alphabetical order
          const sortedNames = [...allMetricNames].sort();
          const alphabeticalIndex = sortedNames.indexOf(metricName);
          if (alphabeticalIndex >= 0) {
            return getUniqueColor(alphabeticalIndex);
          }
        }
        // Fallback to index if allMetricNames not provided
        if (index !== undefined) {
          return getUniqueColor(index);
        }
        return "";
      default:
        return "";
    }
  };

  const renderMetrics = () => {
    if (!displayData.metrics) return null;

    switch (chartType) {
      case "total": {
        const netWorth =
          displayData.primaryValue ||
          (displayData.metrics["Net Worth"] as number);
        const isPercentage = totalOptions?.viewType === "percentage";

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                NET WORTH
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  netWorth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(netWorth)}
              </div>
            </div>

            {/* Account Type Breakdown - Horizontal Scrollable - Always render to maintain layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN BY TYPE
              </div>
              {accountTypesForTotal.length > 0 ? (
                <NetWorthCards
                  netWorth={netWorth}
                  assets={accountTypesForTotal}
                  chartCurrency={chartCurrency}
                  getColor={(name, index, allNames) =>
                    getMetricColor(chartType, name, index, allNames)
                  }
                  allAccountTypeNames={
                    displayData.metrics
                      ? Object.keys(displayData.metrics).filter(
                          (key) => key !== "Net Worth"
                        )
                      : accountTypesForTotal.map((acc) => acc.name)
                  }
                  isPercentageView={isPercentage}
                  hoveredCardName={hoveredCardName}
                  onCardHover={onCardHover}
                />
              ) : (
                // Placeholder to maintain space when no account types
                <div className="min-h-[70px]"></div>
              )}
            </div>
          </div>
        );
      }

      case "assets-vs-liabilities": {
        const assets = displayData.metrics["Assets"] as number;
        const liabilities = displayData.metrics["Liabilities"] as number;
        const netWorth =
          displayData.primaryValue ||
          (displayData.metrics["Net Worth"] as number);

        const secondaryMetrics: Array<{
          name: string;
          value: number;
          absValue: number;
        }> = [];
        // Fixed order: Assets first, then Liabilities
        if (assets !== undefined) {
          secondaryMetrics.push({
            name: "Assets",
            value: assets,
            absValue: Math.abs(assets),
          });
        }
        if (liabilities !== undefined) {
          secondaryMetrics.push({
            name: "Liabilities",
            value: liabilities,
            absValue: Math.abs(liabilities),
          });
        }
        // No sorting needed - fixed order above

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                NET WORTH
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  netWorth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(netWorth)}
              </div>
            </div>

            {/* Always render to maintain consistent layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN
              </div>
              {secondaryMetrics.length > 0 ? (
                <NetWorthCards
                  netWorth={netWorth}
                  assets={secondaryMetrics}
                  chartCurrency={chartCurrency}
                  getColor={(name, index, allNames) =>
                    getMetricColor(chartType, name, index, allNames)
                  }
                  allAccountTypeNames={secondaryMetrics.map((m) => m.name)}
                  isPercentageView={false}
                  hoveredCardName={hoveredCardName}
                  onCardHover={onCardHover}
                />
              ) : (
                <div className="min-h-[70px]"></div>
              )}
            </div>
          </div>
        );
      }

      case "monthly-growth-rate": {
        const growthRate = displayData.metrics["Growth Rate"] as number;

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                GROWTH RATE
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
                  growthRate >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatPercentage(growthRate, 2)}
              </div>
            </div>

            {/* Always render to maintain consistent layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN
              </div>
              <div className="min-h-[70px]"></div>
            </div>
          </div>
        );
      }

      case "by-account": {
        const total =
          displayData.primaryValue || (displayData.metrics["Total"] as number);
        return (
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              TOTAL NET WORTH
            </div>
            <div
              className={`text-2xl sm:text-3xl font-bold ${
                total >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatValue(total)}
            </div>
          </div>
        );
      }

      case "by-wealth-source": {
        const savingsFromIncome = displayData.metrics[
          "Savings from Income"
        ] as number;
        const interestEarned = displayData.metrics["Interest Earned"] as number;
        const capitalGains = displayData.metrics["Capital Gains"] as number;
        const totalGrowth =
          (savingsFromIncome || 0) +
          (interestEarned || 0) +
          (capitalGains || 0);

        const secondaryMetrics: Array<{
          name: string;
          value: number;
          absValue: number;
        }> = [];
        // Logical flow order: Savings from Income → Interest Earned → Capital Gains
        if (savingsFromIncome !== undefined) {
          secondaryMetrics.push({
            name: "Savings from Income",
            value: savingsFromIncome,
            absValue: Math.abs(savingsFromIncome),
          });
        }
        if (interestEarned !== undefined) {
          secondaryMetrics.push({
            name: "Interest Earned",
            value: interestEarned,
            absValue: Math.abs(interestEarned),
          });
        }
        if (capitalGains !== undefined) {
          secondaryMetrics.push({
            name: "Capital Gains",
            value: capitalGains,
            absValue: Math.abs(capitalGains),
          });
        }
        // No sorting needed - fixed logical order above

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                TOTAL GROWTH
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  totalGrowth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(totalGrowth)}
              </div>
            </div>

            {/* Always render to maintain consistent layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN
              </div>
              {secondaryMetrics.length > 0 ? (
                <NetWorthCards
                  netWorth={totalGrowth}
                  assets={secondaryMetrics}
                  chartCurrency={chartCurrency}
                  getColor={(name, index, allNames) =>
                    getMetricColor(chartType, name, index, allNames)
                  }
                  allAccountTypeNames={secondaryMetrics.map((m) => m.name)}
                  isPercentageView={false}
                  hoveredCardName={hoveredCardName}
                  onCardHover={onCardHover}
                />
              ) : (
                <div className="min-h-[70px]"></div>
              )}
            </div>
          </div>
        );
      }

      case "allocation": {
        const total = displayData.primaryValue || 0;
        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                TOTAL VALUE
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  total >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(total)}
              </div>
            </div>

            {/* Always render to maintain consistent layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN
              </div>
              <div className="min-h-[70px]"></div>
            </div>
          </div>
        );
      }

      case "waterfall": {
        const endingBalance = displayData.metrics["Ending Balance"] as number;
        const startingBalance = displayData.metrics[
          "Starting Balance"
        ] as number;
        const savingsFromIncome = displayData.metrics[
          "Savings from Income"
        ] as number;
        const interestEarned = displayData.metrics["Interest Earned"] as number;
        const capitalGains = displayData.metrics["Capital Gains"] as number;
        const netChange = endingBalance - (startingBalance || 0);

        const secondaryMetrics: Array<{
          name: string;
          value: number;
          absValue: number;
        }> = [];
        // Chronological/logical flow order: Starting Balance → Savings from Income → Interest Earned → Capital Gains → Net Change
        if (startingBalance !== undefined) {
          secondaryMetrics.push({
            name: "Starting Balance",
            value: startingBalance,
            absValue: Math.abs(startingBalance),
          });
        }
        if (savingsFromIncome !== undefined) {
          secondaryMetrics.push({
            name: "Savings from Income",
            value: savingsFromIncome,
            absValue: Math.abs(savingsFromIncome),
          });
        }
        if (interestEarned !== undefined) {
          secondaryMetrics.push({
            name: "Interest Earned",
            value: interestEarned,
            absValue: Math.abs(interestEarned),
          });
        }
        if (capitalGains !== undefined) {
          secondaryMetrics.push({
            name: "Capital Gains",
            value: capitalGains,
            absValue: Math.abs(capitalGains),
          });
        }
        if (netChange !== undefined && !isNaN(netChange)) {
          secondaryMetrics.push({
            name: "Net Change",
            value: netChange,
            absValue: Math.abs(netChange),
          });
        }
        // No sorting needed - fixed chronological order above

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                ENDING BALANCE
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  endingBalance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(endingBalance)}
              </div>
            </div>

            {/* Always render to maintain consistent layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN
              </div>
              {secondaryMetrics.length > 0 ? (
                <NetWorthCards
                  netWorth={endingBalance}
                  assets={secondaryMetrics}
                  chartCurrency={chartCurrency}
                  getColor={(name, index, allNames) =>
                    getMetricColor(chartType, name, index, allNames)
                  }
                  allAccountTypeNames={secondaryMetrics.map((m) => m.name)}
                  isPercentageView={false}
                  hoveredCardName={hoveredCardName}
                  onCardHover={onCardHover}
                />
              ) : (
                <div className="min-h-[70px]"></div>
              )}
            </div>
          </div>
        );
      }

      case "savings-rate": {
        const savingsRate = displayData.metrics["Savings Rate"] as number;
        const totalIncome = displayData.metrics["Total Income"] as number;
        const totalExpenditure = displayData.metrics[
          "Total Expenditure"
        ] as number;
        const savingsFromIncome = displayData.metrics[
          "Savings from Income"
        ] as number;

        const secondaryMetrics: Array<{
          name: string;
          value: number;
          absValue: number;
        }> = [];

        if (totalIncome !== undefined) {
          secondaryMetrics.push({
            name: "Total Income",
            value: totalIncome,
            absValue: Math.abs(totalIncome),
          });
        }
        if (totalExpenditure !== undefined) {
          secondaryMetrics.push({
            name: "Total Expenditure",
            value: totalExpenditure,
            absValue: Math.abs(totalExpenditure),
          });
        }
        if (savingsFromIncome !== undefined) {
          secondaryMetrics.push({
            name: "Savings from Income",
            value: savingsFromIncome,
            absValue: Math.abs(savingsFromIncome),
          });
        }

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                SAVINGS RATE
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
                  savingsRate >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {savingsRate !== undefined && !isNaN(savingsRate)
                  ? `${savingsRate >= 0 ? "+" : ""}${Math.round(savingsRate)}%`
                  : "—"}
              </div>
            </div>

            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN
              </div>
              {secondaryMetrics.length > 0 ? (
                <NetWorthCards
                  netWorth={
                    secondaryMetrics.find((m) => m.name === "Total Income")
                      ?.value || 0
                  }
                  assets={secondaryMetrics}
                  chartCurrency={chartCurrency}
                  getColor={(name, index, allNames) =>
                    getMetricColor(chartType, name, index, allNames)
                  }
                  allAccountTypeNames={secondaryMetrics.map((m) => m.name)}
                  isPercentageView={false}
                  hoveredCardName={hoveredCardName}
                  onCardHover={onCardHover}
                />
              ) : (
                <div className="min-h-[70px]"></div>
              )}
            </div>
          </div>
        );
      }

      case "projection": {
        const netWorth =
          displayData.primaryValue ||
          (displayData.metrics["Net Worth"] as number);
        const isPercentage = projectionOptions?.viewType === "percentage";

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                PROJECTED NET WORTH
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  netWorth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(netWorth)}
              </div>
            </div>

            {/* Account Type Breakdown - Horizontal Scrollable - Always render to maintain layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN BY TYPE
              </div>
              {accountTypesForProjection.length > 0 ? (
                <NetWorthCards
                  netWorth={netWorth}
                  assets={accountTypesForProjection}
                  chartCurrency={chartCurrency}
                  getColor={(name, index, allNames) =>
                    getMetricColor(chartType, name, index, allNames)
                  }
                  allAccountTypeNames={
                    displayData.metrics
                      ? Object.keys(displayData.metrics).filter(
                          (key) => key !== "Net Worth"
                        )
                      : accountTypesForProjection.map((acc) => acc.name)
                  }
                  isPercentageView={isPercentage}
                  hoveredCardName={hoveredCardName}
                  onCardHover={onCardHover}
                />
              ) : (
                // Placeholder to maintain space when no account types
                <div className="min-h-[70px]"></div>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="mb-4 w-full">
      {/* Primary metrics */}
      <div className="w-full">{renderMetrics()}</div>

      {/* Header Controls - inline and scrollable with fixed min-height to prevent layout shifts */}
      <div
        className="w-full mt-3 min-h-[40px] overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth touch-pan-x"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {headerControls && (
          <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
            {headerControls}
          </div>
        )}
      </div>
    </div>
  );
}
