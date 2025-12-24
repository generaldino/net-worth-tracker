"use client";

import React from "react";
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
  }, [chartType, displayData]);

  const accountTypesForProjection = useMemo(() => {
    if (chartType !== "projection" || !displayData?.metrics) return [];
    
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
  }, [chartType, displayData]);

  // Early return after all hooks - but still render headerControls even if no data
  if (!displayData) {
    // Still render header controls even when there's no data (e.g., for scenario selection)
    if (headerControls) {
      return (
        <div className="mb-4 w-full">
          <div 
            className="w-full mt-3 overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth touch-pan-x"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
              {headerControls}
            </div>
          </div>
        </div>
      );
    }
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

  // Helper component for scrollable secondary metrics
  const ScrollableMetrics = ({
    metrics,
    primaryValue,
    formatValue: formatValueFn,
    getLabel,
    getColor,
    isPercentage = false,
    showPercentage = false,
  }: {
    metrics: Array<{ name: string; value: number; absValue: number }>;
    primaryValue?: number;
    formatValue: (value: number) => string;
    getLabel: (name: string) => string;
    getColor?: (name: string, value: number) => string;
    isPercentage?: boolean;
    showPercentage?: boolean;
  }) => {
    if (metrics.length === 0) return null;

    return (
      <div className="w-full">
        <div className="text-xs text-muted-foreground mb-2">BREAKDOWN</div>
        <div 
          className="w-full overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            msOverflowStyle: '-ms-autohiding-scrollbar'
          }}
        >
          <div className="flex gap-3 pb-1" style={{ width: 'max-content', minWidth: '100%' }}>
            {metrics.map((item) => {
              const percentage = isPercentage
                ? item.absValue.toFixed(1)
                : primaryValue && primaryValue !== 0
                  ? ((item.value / Math.abs(primaryValue)) * 100).toFixed(1)
                  : "0.0";
              
              const colorClass = getColor ? getColor(item.name, item.value) : "";
              
              return (
                <div
                  key={item.name}
                  className={`flex-shrink-0 bg-muted/30 rounded-lg p-2.5 sm:p-3 border min-w-[110px] sm:min-w-[140px] select-none ${colorClass}`}
                >
                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                    {getLabel(item.name)}
                  </div>
                  <div className="text-sm sm:text-base font-semibold">
                    {isPercentage
                      ? `${percentage}%`
                      : formatValueFn(item.value)}
                  </div>
                  {!isPercentage && showPercentage && (
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
    );
  };

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
                  className="w-full overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
                  style={{ 
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'thin',
                    msOverflowStyle: '-ms-autohiding-scrollbar'
                  }}
                >
                  <div className="flex gap-3 pb-1" style={{ width: 'max-content', minWidth: '100%' }}>
                    {accountTypesForTotal.map((item) => {
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
                          className="flex-shrink-0 bg-muted/30 rounded-lg p-2.5 sm:p-3 border min-w-[110px] sm:min-w-[140px] select-none"
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
        
        const secondaryMetrics = [];
        if (assets !== undefined) {
          secondaryMetrics.push({ name: "Assets", value: assets, absValue: Math.abs(assets) });
        }
        if (liabilities !== undefined) {
          secondaryMetrics.push({ name: "Liabilities", value: liabilities, absValue: Math.abs(liabilities) });
        }
        secondaryMetrics.sort((a, b) => b.absValue - a.absValue);

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">NET WORTH</div>
              <div className={`text-2xl sm:text-3xl font-bold ${netWorth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatValue(netWorth)}
              </div>
            </div>
            
            {secondaryMetrics.length > 0 && (
              <ScrollableMetrics
                metrics={secondaryMetrics}
                primaryValue={netWorth}
                formatValue={formatValue}
                getLabel={(name) => name.toUpperCase()}
                getColor={(name) => name === "Assets" ? "text-green-600" : "text-red-600"}
                showPercentage={false}
              />
            )}
          </div>
        );
      }

      case "monthly-growth-rate": {
        const growthRate = displayData.metrics["Growth Rate"] as number;

        return (
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">GROWTH RATE</div>
            <div className={`text-2xl sm:text-3xl font-bold ${growthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatPercentage(growthRate, 2)}
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
        
        const secondaryMetrics = [];
        if (savingsFromIncome !== undefined) {
          secondaryMetrics.push({ name: "Savings from Income", value: savingsFromIncome, absValue: Math.abs(savingsFromIncome) });
        }
        if (interestEarned !== undefined) {
          secondaryMetrics.push({ name: "Interest Earned", value: interestEarned, absValue: Math.abs(interestEarned) });
        }
        if (capitalGains !== undefined) {
          secondaryMetrics.push({ name: "Capital Gains", value: capitalGains, absValue: Math.abs(capitalGains) });
        }
        secondaryMetrics.sort((a, b) => b.absValue - a.absValue);

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">TOTAL GROWTH</div>
              <div className={`text-2xl sm:text-3xl font-bold ${totalGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatValue(totalGrowth)}
              </div>
            </div>
            
            {secondaryMetrics.length > 0 && (
              <ScrollableMetrics
                metrics={secondaryMetrics}
                primaryValue={totalGrowth}
                formatValue={formatValue}
                getLabel={(name) => name.toUpperCase()}
                getColor={(name, value) => name === "Capital Gains" && value < 0 ? "text-red-600" : "text-green-600"}
                showPercentage={true}
              />
            )}
          </div>
        );
      }

      case "savings-rate": {
        const savingsRate = displayData.metrics["Savings Rate"] as number;
        const totalIncome = displayData.metrics["Total Income"] as number;
        const totalSavings = displayData.metrics["Savings from Income"] as number;
        
        const secondaryMetrics = [];
        if (totalIncome !== undefined) {
          secondaryMetrics.push({ name: "Total Income", value: totalIncome, absValue: Math.abs(totalIncome) });
        }
        if (totalSavings !== undefined) {
          secondaryMetrics.push({ name: "Total Savings", value: totalSavings, absValue: Math.abs(totalSavings) });
        }
        secondaryMetrics.sort((a, b) => b.absValue - a.absValue);

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">SAVINGS RATE</div>
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                {savingsRate !== undefined ? `${Number(savingsRate.toFixed(1))}%` : "—"}
              </div>
            </div>
            
            {secondaryMetrics.length > 0 && (
              <ScrollableMetrics
                metrics={secondaryMetrics}
                formatValue={formatValue}
                getLabel={(name) => name.toUpperCase()}
                getColor={(name) => name === "Total Savings" ? "text-green-600" : ""}
                showPercentage={false}
              />
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
        const savingsFromIncome = displayData.metrics["Savings from Income"] as number;
        const interestEarned = displayData.metrics["Interest Earned"] as number;
        const capitalGains = displayData.metrics["Capital Gains"] as number;
        const netChange = endingBalance - (startingBalance || 0);
        
        const secondaryMetrics = [];
        if (netChange !== undefined && !isNaN(netChange)) {
          secondaryMetrics.push({ name: "Net Change", value: netChange, absValue: Math.abs(netChange) });
        }
        if (startingBalance !== undefined) {
          secondaryMetrics.push({ name: "Starting Balance", value: startingBalance, absValue: Math.abs(startingBalance) });
        }
        if (savingsFromIncome !== undefined) {
          secondaryMetrics.push({ name: "Savings from Income", value: savingsFromIncome, absValue: Math.abs(savingsFromIncome) });
        }
        if (interestEarned !== undefined) {
          secondaryMetrics.push({ name: "Interest Earned", value: interestEarned, absValue: Math.abs(interestEarned) });
        }
        if (capitalGains !== undefined) {
          secondaryMetrics.push({ name: "Capital Gains", value: capitalGains, absValue: Math.abs(capitalGains) });
        }
        secondaryMetrics.sort((a, b) => b.absValue - a.absValue);

        return (
          <div className="space-y-3">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">ENDING BALANCE</div>
              <div className="text-2xl sm:text-3xl font-bold">
                {formatValue(endingBalance)}
              </div>
            </div>
            
            {secondaryMetrics.length > 0 && (
              <ScrollableMetrics
                metrics={secondaryMetrics}
                primaryValue={endingBalance}
                formatValue={formatValue}
                getLabel={(name) => name.toUpperCase()}
                getColor={(name, value) => {
                  if (name === "Net Change" || name === "Capital Gains") {
                    return value >= 0 ? "text-green-600" : "text-red-600";
                  }
                  return name === "Savings from Income" || name === "Interest Earned" ? "text-green-600" : "";
                }}
                showPercentage={false}
              />
            )}
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
                  className="w-full overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
                  style={{ 
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'thin',
                    msOverflowStyle: '-ms-autohiding-scrollbar'
                  }}
                >
                  <div className="flex gap-3 pb-1" style={{ width: 'max-content', minWidth: '100%' }}>
                    {accountTypesForProjection.map((item) => {
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
                          className="flex-shrink-0 bg-muted/30 rounded-lg p-2.5 sm:p-3 border min-w-[110px] sm:min-w-[140px] select-none"
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
      
      {/* Header Controls - inline and scrollable */}
      {headerControls && (
        <div 
          className="w-full mt-3 overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
            {headerControls}
          </div>
        </div>
      )}
    </div>
  );
}

