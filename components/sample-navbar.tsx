"use client";

import { useMemo, useEffect } from "react";
import { useNetWorth } from "@/contexts/net-worth-context";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useExchangeRates } from "@/contexts/exchange-rates-context";
import { useMasking } from "@/contexts/masking-context";
import type { Currency } from "@/lib/fx-rates";
import { getCurrencySymbol, formatPercentage } from "@/lib/fx-rates";

/**
 * Financial Metrics Navbar Component
 *
 * Displays key financial metrics in a horizontal navbar layout with:
 * - Net Worth, Income, Spending, and Saved amounts
 * - Toggle between YTD (Year to Date) and All Time views
 * - Year-over-Year (YoY) percentage changes with color-coded backgrounds
 * - Responsive design that adapts to mobile/tablet/desktop
 */

type PeriodType = "ytd" | "alltime";

interface MetricData {
  label: string;
  ytd: number;
  alltime: number;
  ytdYoyChange?: number; // Year-over-year change for YTD period
  alltimeYoyChange?: number; // Year-over-year change for All Time period
  prefix: string; // Currency symbol or prefix
}

function convertCurrencyAmount(
  breakdown: Array<{ currency: string; amount: number }>,
  targetCurrency: Currency,
  month: string | null,
  getRate: (month: string, currency: Currency) => number | null
): number {
  if (!month) return 0;

  const monthKey = /^\d{4}-\d{2}$/.test(month) ? month : month.substring(0, 7);

  return breakdown.reduce((total, item) => {
    const itemCurrency = item.currency as Currency;
    const amount = item.amount;

    if (itemCurrency === targetCurrency) {
      return total + amount;
    }

    // Get exchange rates
    const fromRate = getRate(monthKey, itemCurrency);
    const toRate = getRate(monthKey, targetCurrency);

    if (fromRate === null || toRate === null) {
      // Rates not loaded yet, return original amount
      return total + amount;
    }

    // Convert: amount in fromCurrency -> GBP -> toCurrency
    let amountInGbp: number;
    if (itemCurrency === "GBP") {
      amountInGbp = amount;
    } else {
      amountInGbp = amount / fromRate;
    }

    let amountInTarget: number;
    if (targetCurrency === "GBP") {
      amountInTarget = amountInGbp;
    } else {
      amountInTarget = amountInGbp * toRate;
    }

    return total + amountInTarget;
  }, 0);
}

interface FinancialMetricsNavbarProps {
  period: PeriodType;
  setPeriod?: (period: PeriodType) => void;
}

export function FinancialMetricsNavbar({
  period,
}: FinancialMetricsNavbarProps) {
  const { financialMetrics } = useNetWorth();
  const { displayCurrency } = useDisplayCurrency();
  const { getRate, fetchRates } = useExchangeRates();
  const { isMasked } = useMasking();

  // Fetch rates for the latest month when component mounts
  useEffect(() => {
    if (displayCurrency !== "BASE" && financialMetrics?.latestMonth) {
      const month = /^\d{4}-\d{2}$/.test(financialMetrics.latestMonth)
        ? financialMetrics.latestMonth
        : financialMetrics.latestMonth.substring(0, 7);
      fetchRates([month]);
    }
  }, [displayCurrency, financialMetrics?.latestMonth, fetchRates]);

  const targetCurrency =
    displayCurrency === "BASE" ? "GBP" : (displayCurrency as Currency);

  // Convert all amounts to display currency
  // Net worth values are in GBP (base currency), so convert from GBP to target
  // For YTD: show current net worth
  // For All Time: show the change from first entry to current (current - first)
  const netWorthYTDConverted = useMemo(() => {
    if (!financialMetrics) return 0;
    if (displayCurrency === "BASE") return financialMetrics.netWorthYTD;

    const month = financialMetrics.latestMonth
      ? /^\d{4}-\d{2}$/.test(financialMetrics.latestMonth)
        ? financialMetrics.latestMonth
        : financialMetrics.latestMonth.substring(0, 7)
      : "latest";

    const targetRate = getRate(month, targetCurrency);
    if (targetRate === null) {
      // Rates not loaded yet, return original amount
      return financialMetrics.netWorthYTD;
    }

    // Convert from GBP to target currency
    return financialMetrics.netWorthYTD * targetRate;
  }, [displayCurrency, financialMetrics, targetCurrency, getRate]);

  const incomeYTDConverted = useMemo(() => {
    if (!financialMetrics) return 0;
    if (displayCurrency === "BASE") return financialMetrics.incomeYTD;
    return convertCurrencyAmount(
      financialMetrics.incomeBreakdownYTD,
      targetCurrency,
      financialMetrics.latestMonth,
      getRate
    );
  }, [displayCurrency, financialMetrics, targetCurrency, getRate]);

  const incomeAllTimeConverted = useMemo(() => {
    if (!financialMetrics) return 0;
    if (displayCurrency === "BASE") return financialMetrics.incomeAllTime;
    return convertCurrencyAmount(
      financialMetrics.incomeBreakdownAllTime,
      targetCurrency,
      financialMetrics.latestMonth,
      getRate
    );
  }, [displayCurrency, financialMetrics, targetCurrency, getRate]);

  const expenditureYTDConverted = useMemo(() => {
    if (!financialMetrics) return 0;
    if (displayCurrency === "BASE") return financialMetrics.expenditureYTD;
    return convertCurrencyAmount(
      financialMetrics.expenditureBreakdownYTD,
      targetCurrency,
      financialMetrics.latestMonth,
      getRate
    );
  }, [displayCurrency, financialMetrics, targetCurrency, getRate]);

  const expenditureAllTimeConverted = useMemo(() => {
    if (!financialMetrics) return 0;
    if (displayCurrency === "BASE") return financialMetrics.expenditureAllTime;
    return convertCurrencyAmount(
      financialMetrics.expenditureBreakdownAllTime,
      targetCurrency,
      financialMetrics.latestMonth,
      getRate
    );
  }, [displayCurrency, financialMetrics, targetCurrency, getRate]);

  // Convert savings amounts
  // Savings = Income - Expenditure, so convert both and subtract
  const savingsYTDConverted = useMemo(() => {
    if (!financialMetrics) return 0;
    return incomeYTDConverted - expenditureYTDConverted;
  }, [financialMetrics, incomeYTDConverted, expenditureYTDConverted]);

  const savingsAllTimeConverted = useMemo(() => {
    if (!financialMetrics) return 0;
    return incomeAllTimeConverted - expenditureAllTimeConverted;
  }, [financialMetrics, incomeAllTimeConverted, expenditureAllTimeConverted]);

  // Prepare metrics array - use server values directly
  const metrics: MetricData[] = useMemo(() => {
    if (!financialMetrics) return [];

    return [
      {
        label: "Net Worth",
        ytd: netWorthYTDConverted,
        alltime: netWorthYTDConverted, // All Time net worth is same as current (it's a snapshot)
        ytdYoyChange: financialMetrics.netWorthPercentageYTD ?? undefined,
        alltimeYoyChange:
          financialMetrics.netWorthPercentageAllTime ?? undefined,
        prefix: getCurrencySymbol(targetCurrency),
      },
      {
        label: "Earned",
        ytd: incomeYTDConverted,
        alltime: incomeAllTimeConverted,
        ytdYoyChange: financialMetrics.incomePercentageYTD ?? undefined,
        alltimeYoyChange: financialMetrics.incomePercentageAllTime ?? undefined,
        prefix: getCurrencySymbol(targetCurrency),
      },
      {
        label: "Spent",
        ytd: expenditureYTDConverted,
        alltime: expenditureAllTimeConverted,
        ytdYoyChange: financialMetrics.spendingRateYTD ?? undefined,
        alltimeYoyChange: financialMetrics.spendingRateAllTime ?? undefined,
        prefix: getCurrencySymbol(targetCurrency),
      },
      {
        label: "Saved",
        ytd: savingsYTDConverted,
        alltime: savingsAllTimeConverted,
        ytdYoyChange: financialMetrics.savingsRateYTD ?? undefined,
        alltimeYoyChange: financialMetrics.savingsRateAllTime ?? undefined,
        prefix: getCurrencySymbol(targetCurrency),
      },
    ];
  }, [
    financialMetrics,
    netWorthYTDConverted,
    incomeYTDConverted,
    incomeAllTimeConverted,
    expenditureYTDConverted,
    expenditureAllTimeConverted,
    savingsYTDConverted,
    savingsAllTimeConverted,
    targetCurrency,
  ]);

  /**
   * Formats large numbers into compact notation (e.g., 125840 → "125.8K")
   * Adjust maximumFractionDigits based on your preference
   */
  const formatCurrency = (value: number) => {
    if (isMasked) {
      return "••••";
    }
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(value);
  };

  /**
   * Gets the appropriate value based on selected period (YTD or All Time)
   */
  const getValue = (metric: MetricData) => {
    return period === "ytd" ? metric.ytd : metric.alltime;
  };

  /**
   * Gets the appropriate YoY change based on selected period
   * Returns the period-specific YoY change if available
   */
  const getYoyChange = (metric: MetricData) => {
    return period === "ytd" ? metric.ytdYoyChange : metric.alltimeYoyChange;
  };

  // Don't render if no data
  if (!financialMetrics || metrics.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 overflow-x-auto sm:gap-6">
      {metrics.map((metric, index) => (
        <div key={index} className="flex items-center gap-4">
          {/* Individual Metric */}
          <div className="flex flex-col gap-0.5">
            {/* Metric Label and YoY Badge */}
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                {metric.label}
              </span>

              {/* YoY Percentage Badge with colored background */}
              {getYoyChange(metric) !== undefined &&
                metric.label !== "Earned" &&
                (metric.label === "Spent" || metric.label === "Saved" ? (
                  // Spent and Saved show "X% of income" format in grey
                  <span className="whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold font-mono tabular-nums bg-muted text-muted-foreground">
                    {Math.abs(getYoyChange(metric)!).toFixed(1)}% of income
                  </span>
                ) : (
                  // Net Worth shows signed percentage with color
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-semibold font-mono tabular-nums ${
                      getYoyChange(metric)! >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                    }`}
                  >
                    {formatPercentage(getYoyChange(metric)!, {
                      showSign: true,
                    })}
                  </span>
                ))}
            </div>

            {/* Metric Value */}
            <span className="whitespace-nowrap text-base font-bold tabular-nums text-foreground sm:text-lg">
              {metric.prefix}
              {formatCurrency(getValue(metric))}
            </span>
          </div>

          {/* Vertical divider between metrics (not after last one) */}
          {index < metrics.length - 1 && <div className="h-8 w-px bg-border" />}
        </div>
      ))}
    </div>
  );
}
