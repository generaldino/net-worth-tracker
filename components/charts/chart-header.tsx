"use client";

import React from "react";
import { ChartType } from "@/components/charts/types";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { useMemo } from "react";
import { COLORS, CHART_GREEN, CHART_RED, getUniqueColor } from "./constants";

// Helper to format account type names (matches chart-display.tsx)
function formatAccountTypeName(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

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

  // Helper component for scrollable secondary metrics
  const ScrollableMetrics = ({
    metrics,
    primaryValue,
    formatValue: formatValueFn,
    getLabel,
    getColor,
    getColorSwatch,
    isPercentage = false,
    showPercentage = false,
  }: {
    metrics: Array<{ name: string; value: number; absValue: number }>;
    primaryValue?: number;
    formatValue: (value: number) => string;
    getLabel: (name: string) => string;
    getColor?: (name: string, value: number) => string;
    getColorSwatch?: (name: string, index: number) => string;
    isPercentage?: boolean;
    showPercentage?: boolean;
  }) => {
    // Always render container to maintain consistent layout, even when empty
    return (
      <div className="w-full min-h-[120px]">
        <div className="text-xs text-muted-foreground mb-2">BREAKDOWN</div>
        <div
          className="w-full overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
            msOverflowStyle: "-ms-autohiding-scrollbar",
          }}
        >
          <div
            className="flex gap-3 pb-1"
            style={{ width: "max-content", minWidth: "100%" }}
          >
            {metrics.length > 0 ? (
              metrics.map((item, index) => {
                const percentage = isPercentage
                  ? item.absValue.toFixed(1)
                  : primaryValue && primaryValue !== 0
                  ? ((item.value / Math.abs(primaryValue)) * 100).toFixed(1)
                  : "0.0";

                const colorClass = getColor
                  ? getColor(item.name, item.value)
                  : "";

                const colorSwatch = getColorSwatch
                  ? getColorSwatch(item.name, index)
                  : "";

                return (
                  <div
                    key={item.name}
                    className={`flex-shrink-0 bg-muted/30 rounded-lg p-2.5 sm:p-3 border min-w-[110px] sm:min-w-[140px] select-none min-h-[70px] flex flex-col justify-between ${colorClass}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {colorSwatch && (
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: colorSwatch }}
                        />
                      )}
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {getLabel(item.name)}
                      </div>
                    </div>
                    <div className="text-sm sm:text-base font-semibold">
                      {isPercentage
                        ? `${percentage}%`
                        : formatValueFn(item.value)}
                    </div>
                    {/* Always reserve space for percentage line to maintain consistent height */}
                    <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 min-h-[14px]">
                      {!isPercentage && showPercentage
                        ? `${percentage}%`
                        : "\u00A0"}
                    </div>
                  </div>
                );
              })
            ) : (
              // Placeholder to maintain space when no metrics
              <div className="min-h-[70px]"></div>
            )}
          </div>
        </div>
      </div>
    );
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
              <div
                className="w-full overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
                style={{
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "thin",
                  msOverflowStyle: "-ms-autohiding-scrollbar",
                }}
              >
                <div
                  className="flex gap-3 pb-1"
                  style={{ width: "max-content", minWidth: "100%" }}
                >
                  {accountTypesForTotal.length > 0 ? (
                    accountTypesForTotal.map((item, index) => {
                      // When in percentage view, item.value is already a percentage (0-100)
                      // When in absolute view, calculate percentage from absolute value
                      const percentage = isPercentage
                        ? item.absValue.toFixed(1)
                        : netWorth !== 0
                        ? ((item.value / Math.abs(netWorth)) * 100).toFixed(1)
                        : "0.0";

                      // Negative values always in red
                      const valueColorClass =
                        item.value < 0 ? "text-red-600" : "";

                      // Get all account type names from metrics for color calculation
                      // This ensures colors match the chart which uses alphabetical sorting of all account types
                      const allAccountTypeNames = displayData.metrics
                        ? Object.keys(displayData.metrics).filter(
                            (key) => key !== "Net Worth"
                          )
                        : accountTypesForTotal.map((acc) => acc.name);
                      const colorSwatch = getMetricColor(
                        chartType,
                        item.name,
                        index,
                        allAccountTypeNames
                      );

                      return (
                        <div
                          key={item.name}
                          className="flex-shrink-0 bg-muted/30 rounded-lg p-2.5 sm:p-3 border min-w-[110px] sm:min-w-[140px] select-none min-h-[70px] flex flex-col justify-between"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {colorSwatch && (
                              <div
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: colorSwatch }}
                              />
                            )}
                            <div className="text-[10px] sm:text-xs text-muted-foreground">
                              {formatAccountTypeName(item.name)}
                            </div>
                          </div>
                          <div
                            className={`text-sm sm:text-base font-semibold ${valueColorClass}`}
                          >
                            {isPercentage
                              ? `${percentage}%`
                              : formatValue(item.value)}
                          </div>
                          {/* Always reserve space for percentage line to maintain consistent height */}
                          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 min-h-[14px]">
                            {!isPercentage ? `${percentage}%` : "\u00A0"}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Placeholder to maintain space when no account types
                    <div className="min-h-[70px]"></div>
                  )}
                </div>
              </div>
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
            <ScrollableMetrics
              metrics={secondaryMetrics}
              primaryValue={netWorth}
              formatValue={formatValue}
              getLabel={(name) => name.toUpperCase()}
              getColor={(name, value) => {
                // Liabilities are always red, Assets are green unless negative
                if (name === "Liabilities") return "text-red-600";
                if (name === "Assets")
                  return value < 0 ? "text-red-600" : "text-green-600";
                return value < 0 ? "text-red-600" : "";
              }}
              getColorSwatch={(name, index) => {
                // For charts with fixed metric lists, pass all metric names
                const allMetricNames = secondaryMetrics.map((m) => m.name);
                return getMetricColor(chartType, name, index, allMetricNames);
              }}
              showPercentage={false}
            />
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
                className={`text-2xl sm:text-3xl font-bold ${
                  growthRate >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatPercentage(growthRate, 2)}
              </div>
            </div>

            {/* Always render to maintain consistent layout */}
            <ScrollableMetrics
              metrics={[]}
              formatValue={formatValue}
              getLabel={(name) => name.toUpperCase()}
              showPercentage={false}
            />
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
            <ScrollableMetrics
              metrics={secondaryMetrics}
              primaryValue={totalGrowth}
              formatValue={formatValue}
              getLabel={(name) => name.toUpperCase()}
              getColor={(name, value) => {
                // All negative values in red, positive in green
                return value < 0 ? "text-red-600" : "text-green-600";
              }}
              getColorSwatch={(name, index) => {
                // For charts with fixed metric lists, pass all metric names
                const allMetricNames = secondaryMetrics.map((m) => m.name);
                return getMetricColor(chartType, name, index, allMetricNames);
              }}
              showPercentage={true}
            />
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
            <ScrollableMetrics
              metrics={[]}
              formatValue={formatValue}
              getLabel={(name) => name.toUpperCase()}
              showPercentage={false}
            />
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
            <ScrollableMetrics
              metrics={secondaryMetrics}
              primaryValue={endingBalance}
              formatValue={formatValue}
              getLabel={(name) => name.toUpperCase()}
              getColor={(name, value) => {
                // All negative values always in red
                if (value < 0) return "text-red-600";
                // Positive values: green for income/gains, default for others
                if (
                  name === "Savings from Income" ||
                  name === "Interest Earned" ||
                  name === "Net Change" ||
                  name === "Capital Gains"
                ) {
                  return "text-green-600";
                }
                return "";
              }}
              getColorSwatch={(name, index) => {
                // For charts with fixed metric lists, pass all metric names
                const allMetricNames = secondaryMetrics.map((m) => m.name);
                return getMetricColor(chartType, name, index, allMetricNames);
              }}
              showPercentage={false}
            />
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
              <div
                className="w-full overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
                style={{
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "thin",
                  msOverflowStyle: "-ms-autohiding-scrollbar",
                }}
              >
                <div
                  className="flex gap-3 pb-1"
                  style={{ width: "max-content", minWidth: "100%" }}
                >
                  {accountTypesForProjection.length > 0 ? (
                    accountTypesForProjection.map((item, index) => {
                      // When in percentage view, item.value is already a percentage (0-100)
                      // When in absolute view, calculate percentage from absolute value
                      const percentage = isPercentage
                        ? item.absValue.toFixed(1)
                        : netWorth !== 0
                        ? ((item.value / Math.abs(netWorth)) * 100).toFixed(1)
                        : "0.0";

                      // Negative values always in red
                      const valueColorClass =
                        item.value < 0 ? "text-red-600" : "";

                      // Get all account type names from metrics for color calculation
                      // This ensures colors match the chart which uses alphabetical sorting of all account types
                      const allAccountTypeNames = displayData.metrics
                        ? Object.keys(displayData.metrics).filter(
                            (key) => key !== "Net Worth"
                          )
                        : accountTypesForProjection.map((acc) => acc.name);
                      const colorSwatch = getMetricColor(
                        chartType,
                        item.name,
                        index,
                        allAccountTypeNames
                      );

                      return (
                        <div
                          key={item.name}
                          className="flex-shrink-0 bg-muted/30 rounded-lg p-2.5 sm:p-3 border min-w-[110px] sm:min-w-[140px] select-none min-h-[70px] flex flex-col justify-between"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {colorSwatch && (
                              <div
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: colorSwatch }}
                              />
                            )}
                            <div className="text-[10px] sm:text-xs text-muted-foreground">
                              {formatAccountTypeName(item.name)}
                            </div>
                          </div>
                          <div
                            className={`text-sm sm:text-base font-semibold ${valueColorClass}`}
                          >
                            {isPercentage
                              ? `${percentage}%`
                              : formatValue(item.value)}
                          </div>
                          {/* Always reserve space for percentage line to maintain consistent height */}
                          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 min-h-[14px]">
                            {!isPercentage ? `${percentage}%` : "\u00A0"}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Placeholder to maintain space when no account types
                    <div className="min-h-[70px]"></div>
                  )}
                </div>
              </div>
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
