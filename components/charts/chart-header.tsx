"use client";

import { ChartType } from "@/components/charts/types";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { useMemo } from "react";

// Helper to format account type names (matches chart-display.tsx)
function formatAccountTypeName(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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
}: ChartHeaderProps) {
  const { isMasked } = useMasking();
  const displayData = hoveredData || latestData;

  if (!displayData) {
    return null;
  }

  const formatValue = (value: number | undefined): string => {
    if (value === undefined) return "—";
    return isMasked ? "••••••" : formatCurrencyAmount(value, chartCurrency);
  };

  const formatPercentage = (value: number | undefined, decimals: number = 1): string => {
    if (value === undefined) return "—";
    return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
  };

  // Calculate total return and rate of return from latest and first data point
  const totalReturnMetrics = useMemo(() => {
    if (!latestData || !latestData.metrics) return null;
    const latestNetWorth = latestData.primaryValue || (latestData.metrics["Net Worth"] as number);
    if (!latestNetWorth) return null;
    
    // We'll need to pass first entry value as a prop or calculate it differently
    // For now, return null and calculate in parent if needed
    return null;
  }, [latestData]);

  // Extract account types for total and projection charts
  const accountTypesForTotal = useMemo(() => {
    if (chartType !== "total" || !displayData.metrics) return [];
    
    return Object.entries(displayData.metrics)
      .filter(([key]) => key !== "Net Worth")
      .map(([key, value]) => ({
        name: key,
        value: value as number,
        absValue: Math.abs(value as number),
      }))
      .filter((item) => item.absValue > 0) // Only show non-zero values
      .sort((a, b) => b.absValue - a.absValue) // Sort by absolute value descending
      .slice(0, 8); // Show top 8 account types
  }, [chartType, displayData.metrics]);

  const accountTypesForProjection = useMemo(() => {
    if (chartType !== "projection" || !displayData.metrics) return [];
    
    return Object.entries(displayData.metrics)
      .filter(([key]) => key !== "Net Worth")
      .map(([key, value]) => ({
        name: key,
        value: value as number,
        absValue: Math.abs(value as number),
      }))
      .filter((item) => item.absValue > 0) // Only show non-zero values
      .sort((a, b) => b.absValue - a.absValue) // Sort by absolute value descending
      .slice(0, 8); // Show top 8 account types
  }, [chartType, displayData.metrics]);

  const renderMetrics = () => {
    if (!displayData.metrics) return null;

    switch (chartType) {
      case "total": {
        const netWorth = displayData.primaryValue || (displayData.metrics["Net Worth"] as number);
        const isPercentage = totalOptions?.viewType === "percentage";

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">NET WORTH</div>
              <div className="text-2xl sm:text-3xl font-bold">{formatValue(netWorth)}</div>
            </div>
            
            {/* Account Type Breakdown - Horizontal Scrollable */}
            {accountTypesForTotal.length > 0 && (
              <div className="w-full">
                <div className="text-xs text-muted-foreground mb-2">BREAKDOWN BY TYPE</div>
                <div 
                  className="w-full overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth touch-pan-x"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <div className="flex gap-3 pb-1" style={{ width: 'max-content' }}>
                    {accountTypesForTotal.map((item, index) => {
                      // When in percentage view, item.value is already a percentage (0-100)
                      // When in absolute view, calculate percentage from absolute value
                      const percentage = isPercentage
                        ? item.absValue.toFixed(1)
                        : netWorth !== 0 
                          ? ((item.value / Math.abs(netWorth)) * 100).toFixed(1)
                          : "0.0";
                      
                      return (
                        <div
                          key={item.name}
                          className="flex-shrink-0 bg-muted/30 rounded-lg p-2.5 sm:p-3 border min-w-[110px] sm:min-w-[140px] touch-none"
                        >
                          <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                            {formatAccountTypeName(item.name)}
                          </div>
                          <div className="text-sm sm:text-base font-semibold">
                            {isPercentage
                              ? `${percentage}%`
                              : formatValue(item.value)}
                          </div>
                          {!isPercentage && (
                            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                              {percentage}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      case "assets-vs-liabilities": {
        const assets = displayData.metrics["Assets"] as number;
        const liabilities = displayData.metrics["Liabilities"] as number;
        const netWorth = displayData.primaryValue || (displayData.metrics["Net Worth"] as number);
        return (
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">NET WORTH</div>
              <div className={`text-2xl sm:text-3xl font-bold ${netWorth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatValue(netWorth)}
              </div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">ASSETS</div>
              <div className="text-lg sm:text-xl font-semibold text-green-600">
                {formatValue(assets)}
              </div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">LIABILITIES</div>
              <div className="text-lg sm:text-xl font-semibold text-red-600">
                {formatValue(liabilities)}
              </div>
            </div>
          </div>
        );
      }

      case "monthly-growth-rate": {
        const growthRate = displayData.metrics["Growth Rate"] as number;
        const netWorth = displayData.primaryValue || (displayData.metrics["netWorth"] as number);
        return (
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">GROWTH RATE</div>
              <div className={`text-2xl sm:text-3xl font-bold ${growthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatPercentage(growthRate, 2)}
              </div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">NET WORTH</div>
              <div className="text-lg sm:text-xl font-semibold">
                {formatValue(netWorth)}
              </div>
            </div>
          </div>
        );
      }

      case "by-account": {
        const total = displayData.primaryValue || (displayData.metrics["Total"] as number);
        return (
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">TOTAL NET WORTH</div>
            <div className="text-2xl sm:text-3xl font-bold">{formatValue(total)}</div>
          </div>
        );
      }

      case "by-wealth-source": {
        const savingsFromIncome = displayData.metrics["Savings from Income"] as number;
        const interestEarned = displayData.metrics["Interest Earned"] as number;
        const capitalGains = displayData.metrics["Capital Gains"] as number;
        const totalGrowth = (savingsFromIncome || 0) + (interestEarned || 0) + (capitalGains || 0);
        return (
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 flex-wrap">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">TOTAL GROWTH</div>
              <div className={`text-2xl sm:text-3xl font-bold ${totalGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatValue(totalGrowth)}
              </div>
            </div>
            {savingsFromIncome !== undefined && (
              <div>
                <div className="text-xs sm:text-sm text-muted-foreground">SAVINGS FROM INCOME</div>
                <div className="text-lg sm:text-xl font-semibold text-green-600">
                  {formatValue(savingsFromIncome)}
                </div>
              </div>
            )}
            {interestEarned !== undefined && (
              <div>
                <div className="text-xs sm:text-sm text-muted-foreground">INTEREST EARNED</div>
                <div className="text-lg sm:text-xl font-semibold text-green-600">
                  {formatValue(interestEarned)}
                </div>
              </div>
            )}
            {capitalGains !== undefined && (
              <div>
                <div className="text-xs sm:text-sm text-muted-foreground">CAPITAL GAINS</div>
                <div className={`text-lg sm:text-xl font-semibold ${(capitalGains as number) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatValue(capitalGains as number)}
                </div>
              </div>
            )}
          </div>
        );
      }

      case "savings-rate": {
        const savingsRate = displayData.metrics["Savings Rate"] as number;
        const totalIncome = displayData.metrics["Total Income"] as number;
        const totalSavings = displayData.metrics["Savings from Income"] as number;
        return (
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">SAVINGS RATE</div>
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                {savingsRate !== undefined ? `${Number(savingsRate.toFixed(1))}%` : "—"}
              </div>
            </div>
            {totalIncome !== undefined && (
              <div>
                <div className="text-xs sm:text-sm text-muted-foreground">TOTAL INCOME</div>
                <div className="text-lg sm:text-xl font-semibold">
                  {formatValue(totalIncome)}
                </div>
              </div>
            )}
            {totalSavings !== undefined && (
              <div>
                <div className="text-xs sm:text-sm text-muted-foreground">TOTAL SAVINGS</div>
                <div className="text-lg sm:text-xl font-semibold text-green-600">
                  {formatValue(totalSavings)}
                </div>
              </div>
            )}
          </div>
        );
      }

      case "allocation": {
        const total = displayData.primaryValue;
        return (
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">TOTAL VALUE</div>
            <div className="text-2xl sm:text-3xl font-bold">{formatValue(total)}</div>
          </div>
        );
      }

      case "waterfall": {
        const endingBalance = displayData.metrics["Ending Balance"] as number;
        const startingBalance = displayData.metrics["Starting Balance"] as number;
        const netChange = endingBalance - (startingBalance || 0);
        return (
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">ENDING BALANCE</div>
              <div className="text-2xl sm:text-3xl font-bold">
                {formatValue(endingBalance)}
              </div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">NET CHANGE</div>
              <div className={`text-lg sm:text-xl font-semibold ${netChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatValue(netChange)}
              </div>
            </div>
          </div>
        );
      }

      case "projection": {
        const netWorth = displayData.primaryValue || (displayData.metrics["Net Worth"] as number);
        const isPercentage = projectionOptions?.viewType === "percentage";

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">PROJECTED NET WORTH</div>
              <div className="text-2xl sm:text-3xl font-bold">{formatValue(netWorth)}</div>
            </div>
            
            {/* Account Type Breakdown - Horizontal Scrollable */}
            {accountTypesForProjection.length > 0 && (
              <div className="w-full">
                <div className="text-xs text-muted-foreground mb-2">BREAKDOWN BY TYPE</div>
                <div 
                  className="w-full overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth touch-pan-x"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <div className="flex gap-3 pb-1" style={{ width: 'max-content' }}>
                    {accountTypesForProjection.map((item, index) => {
                      // When in percentage view, item.value is already a percentage (0-100)
                      // When in absolute view, calculate percentage from absolute value
                      const percentage = isPercentage
                        ? item.absValue.toFixed(1)
                        : netWorth !== 0 
                          ? ((item.value / Math.abs(netWorth)) * 100).toFixed(1)
                          : "0.0";
                      
                      return (
                        <div
                          key={item.name}
                          className="flex-shrink-0 bg-muted/30 rounded-lg p-2.5 sm:p-3 border min-w-[110px] sm:min-w-[140px] touch-none"
                        >
                          <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                            {formatAccountTypeName(item.name)}
                          </div>
                          <div className="text-sm sm:text-base font-semibold">
                            {isPercentage
                              ? `${percentage}%`
                              : formatValue(item.value)}
                          </div>
                          {!isPercentage && (
                            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                              {percentage}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
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
    </div>
  );
}

