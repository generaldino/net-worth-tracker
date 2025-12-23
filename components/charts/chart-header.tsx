"use client";

import { ChartType } from "@/components/charts/types";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { useMemo } from "react";

interface ChartHeaderProps {
  chartType: ChartType;
  hoveredData: HoveredData | null;
  latestData: HoveredData | null;
  chartCurrency: Currency;
  totalOptions?: {
    viewType?: "absolute" | "percentage";
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

  const renderMetrics = () => {
    if (!displayData.metrics) return null;

    switch (chartType) {
      case "total": {
        const netWorth = displayData.primaryValue || (displayData.metrics["Net Worth"] as number);
        return (
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">NET WORTH</div>
              <div className="text-2xl sm:text-3xl font-bold">{formatValue(netWorth)}</div>
            </div>
            {/* Total Return and Rate of Return would need to be calculated from first entry */}
            {/* For now, we'll show account type breakdown summary if available */}
            {totalOptions?.viewType === "percentage" && (
              <div className="text-xs sm:text-sm text-muted-foreground">
                Showing percentage composition
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
        return (
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground">PROJECTED NET WORTH</div>
            <div className="text-2xl sm:text-3xl font-bold">{formatValue(netWorth)}</div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="mb-4">
      {/* Primary metrics */}
      <div>{renderMetrics()}</div>
    </div>
  );
}

