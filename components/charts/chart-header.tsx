"use client";

import React from "react";
import { ChartType } from "@/components/charts/types";
import {
  formatCurrencyAmount,
  formatPercentage as formatPercentageUtil,
} from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { useMemo } from "react";
import {
  COLORS,
  CHART_GREEN,
  CHART_RED,
  getUniqueColor,
  getAccountTypeColor,
  isAccountType,
} from "./constants";
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
  // Physical assets (priority 15-19)
  Asset: 15,
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
  pinnedData?: HoveredData | null;
  onClearPinned?: () => void;
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
  hiddenCards?: Set<string>;
  onToggleHidden?: (cardName: string) => void;
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
  pinnedData,
  onClearPinned,
  latestData,
  chartCurrency,
  totalOptions,
  projectionOptions,
  headerControls,
  hoveredCardName,
  onCardHover,
  hiddenCards = new Set(),
  onToggleHidden,
}: ChartHeaderProps) {
  const { isMasked } = useMasking();
  // Priority: pinned data > hovered data > latest data
  const displayData = pinnedData || hoveredData || latestData;
  const isPinned = !!pinnedData;

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
    return sortAccountTypesByHierarchy(items);
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
    return sortAccountTypesByHierarchy(items);
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

  const formatPercentage = (value: number | undefined): string => {
    if (value === undefined) return "—";
    return formatPercentageUtil(value, { showSign: true });
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
      case "allocation":
        // For allocation chart, when showing account types, use account type colors
        // Check if this metric name is an account type
        if (isAccountType(metricName)) {
          return getAccountTypeColor(metricName);
        }
        // If it's not an account type (e.g., category view), fallback to index-based color
        if (index !== undefined) {
          return getUniqueColor(index);
        }
        return "";
      case "total":
      case "projection":
        // For account types, use the account type color mapping to match the badges in the accounts table
        // Check if this metric name is an account type
        if (isAccountType(metricName)) {
          return getAccountTypeColor(metricName);
        }
        // If it's not an account type (e.g., "Net Worth"), fallback to index-based color
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
        const fullNetWorth =
          displayData.primaryValue ||
          (displayData.metrics["Net Worth"] as number);
        const isPercentage = totalOptions?.viewType === "percentage";

        // Calculate adjusted net worth excluding hidden cards
        const adjustedNetWorth =
          hiddenCards.size > 0
            ? accountTypesForTotal
                .filter((item) => !hiddenCards.has(item.name))
                .reduce((sum, item) => sum + item.value, 0)
            : fullNetWorth;

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                NET WORTH{" "}
                {hiddenCards.size > 0 && (
                  <span className="text-xs opacity-60">(filtered)</span>
                )}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  adjustedNetWorth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(adjustedNetWorth)}
              </div>
            </div>

            {/* Account Type Breakdown - Horizontal Scrollable - Always render to maintain layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN BY TYPE
              </div>
              {accountTypesForTotal.length > 0 ? (
                <NetWorthCards
                  netWorth={adjustedNetWorth}
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
                  hiddenCards={hiddenCards}
                  onToggleHidden={onToggleHidden}
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
        const fullNetWorth =
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

        // Calculate adjusted net worth excluding hidden cards
        const adjustedNetWorth =
          hiddenCards.size > 0
            ? secondaryMetrics
                .filter((item) => !hiddenCards.has(item.name))
                .reduce((sum, item) => {
                  // Assets are positive, Liabilities should be subtracted
                  return item.name === "Liabilities"
                    ? sum - item.value
                    : sum + item.value;
                }, 0)
            : fullNetWorth;

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                NET WORTH{" "}
                {hiddenCards.size > 0 && (
                  <span className="text-xs opacity-60">(filtered)</span>
                )}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  adjustedNetWorth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(adjustedNetWorth)}
              </div>
            </div>

            {/* Always render to maintain consistent layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN
              </div>
              {secondaryMetrics.length > 0 ? (
                <NetWorthCards
                  netWorth={adjustedNetWorth}
                  assets={secondaryMetrics}
                  chartCurrency={chartCurrency}
                  getColor={(name, index, allNames) =>
                    getMetricColor(chartType, name, index, allNames)
                  }
                  allAccountTypeNames={secondaryMetrics.map((m) => m.name)}
                  isPercentageView={false}
                  hoveredCardName={hoveredCardName}
                  onCardHover={onCardHover}
                  hiddenCards={hiddenCards}
                  onToggleHidden={onToggleHidden}
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
                {formatPercentage(growthRate)}
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
        const fullTotalGrowth =
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

        // Calculate adjusted total excluding hidden cards
        const adjustedTotalGrowth =
          hiddenCards.size > 0
            ? secondaryMetrics
                .filter((item) => !hiddenCards.has(item.name))
                .reduce((sum, item) => sum + item.value, 0)
            : fullTotalGrowth;

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                TOTAL GROWTH{" "}
                {hiddenCards.size > 0 && (
                  <span className="text-xs opacity-60">(filtered)</span>
                )}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  adjustedTotalGrowth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(adjustedTotalGrowth)}
              </div>
            </div>

            {/* Always render to maintain consistent layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN
              </div>
              {secondaryMetrics.length > 0 ? (
                <NetWorthCards
                  netWorth={adjustedTotalGrowth}
                  assets={secondaryMetrics}
                  chartCurrency={chartCurrency}
                  getColor={(name, index, allNames) =>
                    getMetricColor(chartType, name, index, allNames)
                  }
                  allAccountTypeNames={secondaryMetrics.map((m) => m.name)}
                  isPercentageView={false}
                  hoveredCardName={hoveredCardName}
                  onCardHover={onCardHover}
                  hiddenCards={hiddenCards}
                  onToggleHidden={onToggleHidden}
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
        // Convert metrics to assets format for NetWorthCards
        const secondaryMetrics = Object.entries(displayData.metrics || {})
          .filter(
            ([, value]) => typeof value === "number" && value > 0 // Only include assets (positive values)
          )
          .map(([name, value]) => ({
            name,
            value: value as number,
            absValue: Math.abs(value as number),
          }))
          .sort((a, b) => b.value - a.value); // Sort by value descending

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                TOTAL ASSETS{" "}
                {hiddenCards.size > 0 && (
                  <span className="text-xs opacity-60">(filtered)</span>
                )}
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
              {secondaryMetrics.length > 0 ? (
                <NetWorthCards
                  netWorth={total}
                  assets={secondaryMetrics}
                  chartCurrency={chartCurrency}
                  getColor={(name, index, allNames) =>
                    getMetricColor(chartType, name, index, allNames)
                  }
                  allAccountTypeNames={secondaryMetrics.map((m) => m.name)}
                  isPercentageView={false}
                  hoveredCardName={hoveredCardName}
                  onCardHover={onCardHover}
                  hiddenCards={hiddenCards}
                  onToggleHidden={onToggleHidden}
                />
              ) : (
                <div className="min-h-[70px]"></div>
              )}
            </div>
          </div>
        );
      }

      case "waterfall": {
        const fullEndingBalance = displayData.metrics[
          "Ending Balance"
        ] as number;
        const startingBalance = displayData.metrics[
          "Starting Balance"
        ] as number;
        const savingsFromIncome = displayData.metrics[
          "Savings from Income"
        ] as number;
        const interestEarned = displayData.metrics["Interest Earned"] as number;
        const capitalGains = displayData.metrics["Capital Gains"] as number;
        const fullNetChange = fullEndingBalance - (startingBalance || 0);

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
        if (fullNetChange !== undefined && !isNaN(fullNetChange)) {
          secondaryMetrics.push({
            name: "Net Change",
            value: fullNetChange,
            absValue: Math.abs(fullNetChange),
          });
        }
        // No sorting needed - fixed chronological order above

        // Calculate adjusted ending balance excluding hidden cards
        // For waterfall: Starting Balance + visible changes = Adjusted Ending
        const adjustedEndingBalance =
          hiddenCards.size > 0
            ? (hiddenCards.has("Starting Balance") ? 0 : startingBalance || 0) +
              (hiddenCards.has("Savings from Income")
                ? 0
                : savingsFromIncome || 0) +
              (hiddenCards.has("Interest Earned") ? 0 : interestEarned || 0) +
              (hiddenCards.has("Capital Gains") ? 0 : capitalGains || 0)
            : fullEndingBalance;

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                ENDING BALANCE{" "}
                {hiddenCards.size > 0 && (
                  <span className="text-xs opacity-60">(filtered)</span>
                )}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  adjustedEndingBalance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(adjustedEndingBalance)}
              </div>
            </div>

            {/* Always render to maintain consistent layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN
              </div>
              {secondaryMetrics.length > 0 ? (
                <NetWorthCards
                  netWorth={adjustedEndingBalance}
                  assets={secondaryMetrics}
                  chartCurrency={chartCurrency}
                  getColor={(name, index, allNames) =>
                    getMetricColor(chartType, name, index, allNames)
                  }
                  allAccountTypeNames={secondaryMetrics.map((m) => m.name)}
                  isPercentageView={false}
                  hoveredCardName={hoveredCardName}
                  onCardHover={onCardHover}
                  hiddenCards={hiddenCards}
                  onToggleHidden={onToggleHidden}
                />
              ) : (
                <div className="min-h-[70px]"></div>
              )}
            </div>
          </div>
        );
      }

      case "savings-rate": {
        const fullSavingsRate = displayData.metrics["Savings Rate"] as number;
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

        // For savings rate, recalculate based on visible metrics
        // Savings Rate = (Income - Expenditure) / Income * 100
        const visibleIncome = hiddenCards.has("Total Income")
          ? 0
          : totalIncome || 0;
        const visibleExpenditure = hiddenCards.has("Total Expenditure")
          ? 0
          : totalExpenditure || 0;
        const adjustedSavingsRate =
          hiddenCards.size > 0 && visibleIncome > 0
            ? ((visibleIncome - visibleExpenditure) / visibleIncome) * 100
            : fullSavingsRate;

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                SAVINGS RATE{" "}
                {hiddenCards.size > 0 && (
                  <span className="text-xs opacity-60">(filtered)</span>
                )}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
                  adjustedSavingsRate >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {adjustedSavingsRate !== undefined &&
                !isNaN(adjustedSavingsRate)
                  ? `${adjustedSavingsRate >= 0 ? "+" : ""}${Math.round(
                      adjustedSavingsRate
                    )}%`
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
                  hiddenCards={hiddenCards}
                  onToggleHidden={onToggleHidden}
                />
              ) : (
                <div className="min-h-[70px]"></div>
              )}
            </div>
          </div>
        );
      }

      case "projection": {
        const fullNetWorth =
          displayData.primaryValue ||
          (displayData.metrics["Net Worth"] as number);
        const isPercentage = projectionOptions?.viewType === "percentage";

        // Calculate adjusted net worth excluding hidden cards
        const adjustedNetWorth =
          hiddenCards.size > 0
            ? accountTypesForProjection
                .filter((item) => !hiddenCards.has(item.name))
                .reduce((sum, item) => sum + item.value, 0)
            : fullNetWorth;

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                PROJECTED NET WORTH{" "}
                {hiddenCards.size > 0 && (
                  <span className="text-xs opacity-60">(filtered)</span>
                )}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  adjustedNetWorth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(adjustedNetWorth)}
              </div>
            </div>

            {/* Account Type Breakdown - Horizontal Scrollable - Always render to maintain layout */}
            <div className="w-full min-h-[120px]">
              <div className="text-xs text-muted-foreground mb-2">
                BREAKDOWN BY TYPE
              </div>
              {accountTypesForProjection.length > 0 ? (
                <NetWorthCards
                  netWorth={adjustedNetWorth}
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
                  hiddenCards={hiddenCards}
                  onToggleHidden={onToggleHidden}
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
      {/* Pinned Month Indicator */}
      {isPinned && (
        <div className="mb-3 flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-sm">
            <span className="text-primary">📌</span>
            <span className="font-medium text-primary">
              {pinnedData?.month}
            </span>
            <button
              onClick={onClearPinned}
              className="ml-1 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
              aria-label="Clear pinned month"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            Click chart to change • Click again to unpin
          </span>
        </div>
      )}

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
