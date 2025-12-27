"use client";

import { useMasking } from "@/contexts/masking-context";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useExchangeRates } from "@/contexts/exchange-rates-context";
import { useMemo, useEffect } from "react";
import type { Currency } from "@/lib/fx-rates";

interface FinancialMetricsData {
  netWorthYTD: number;
  netWorthAllTime: number;
  netWorthPercentageYTD: number | null;
  incomeYTD: number;
  incomeAllTime: number;
  expenditureYTD: number;
  expenditureAllTime: number;
  savingsYTD: number;
  savingsAllTime: number;
  incomeBreakdownYTD: Array<{ currency: string; amount: number }>;
  incomeBreakdownAllTime: Array<{ currency: string; amount: number }>;
  expenditureBreakdownYTD: Array<{ currency: string; amount: number }>;
  expenditureBreakdownAllTime: Array<{ currency: string; amount: number }>;
  latestMonth: string | null;
}

interface NavbarMetricsProps {
  metrics: FinancialMetricsData;
}

interface MetricData {
  label: string;
  ytd: number;
  alltime: number;
  prefix: string;
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

function getCurrencySymbol(currency: Currency): string {
  switch (currency) {
    case "GBP":
      return "£";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "AED":
      return "د.إ";
    default:
      return "£";
  }
}

/**
 * Formats large numbers into compact notation (e.g., 125840 → "125.8K")
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function NavbarMetrics({ metrics }: NavbarMetricsProps) {
  const { displayCurrency } = useDisplayCurrency();
  const { getRate, fetchRates } = useExchangeRates();
  const { isMasked } = useMasking();

  // Fetch rates for the latest month when component mounts
  useEffect(() => {
    if (displayCurrency !== "BASE" && metrics.latestMonth) {
      const month = /^\d{4}-\d{2}$/.test(metrics.latestMonth)
        ? metrics.latestMonth
        : metrics.latestMonth.substring(0, 7);
      fetchRates([month]);
    }
  }, [displayCurrency, metrics.latestMonth, fetchRates]);

  const targetCurrency =
    displayCurrency === "BASE" ? "GBP" : (displayCurrency as Currency);

  // Convert all amounts to display currency
  const incomeYTDConverted = useMemo(() => {
    if (displayCurrency === "BASE") return metrics.incomeYTD;
    return convertCurrencyAmount(
      metrics.incomeBreakdownYTD,
      targetCurrency,
      metrics.latestMonth,
      getRate
    );
  }, [
    displayCurrency,
    metrics.incomeYTD,
    metrics.incomeBreakdownYTD,
    metrics.latestMonth,
    targetCurrency,
    getRate,
  ]);

  const incomeAllTimeConverted = useMemo(() => {
    if (displayCurrency === "BASE") return metrics.incomeAllTime;
    return convertCurrencyAmount(
      metrics.incomeBreakdownAllTime,
      targetCurrency,
      metrics.latestMonth,
      getRate
    );
  }, [
    displayCurrency,
    metrics.incomeAllTime,
    metrics.incomeBreakdownAllTime,
    metrics.latestMonth,
    targetCurrency,
    getRate,
  ]);

  const expenditureYTDConverted = useMemo(() => {
    if (displayCurrency === "BASE") return metrics.expenditureYTD;
    return convertCurrencyAmount(
      metrics.expenditureBreakdownYTD,
      targetCurrency,
      metrics.latestMonth,
      getRate
    );
  }, [
    displayCurrency,
    metrics.expenditureYTD,
    metrics.expenditureBreakdownYTD,
    metrics.latestMonth,
    targetCurrency,
    getRate,
  ]);

  const expenditureAllTimeConverted = useMemo(() => {
    if (displayCurrency === "BASE") return metrics.expenditureAllTime;
    return convertCurrencyAmount(
      metrics.expenditureBreakdownAllTime,
      targetCurrency,
      metrics.latestMonth,
      getRate
    );
  }, [
    displayCurrency,
    metrics.expenditureAllTime,
    metrics.expenditureBreakdownAllTime,
    metrics.latestMonth,
    targetCurrency,
    getRate,
  ]);

  const savingsYTDConverted = incomeYTDConverted - expenditureYTDConverted;
  const savingsAllTimeConverted =
    incomeAllTimeConverted - expenditureAllTimeConverted;

  // Prepare metrics array matching the sample-navbar structure
  const metricsData: MetricData[] = useMemo(() => {
    return [
      {
        label: "Income",
        ytd: incomeYTDConverted,
        alltime: incomeAllTimeConverted,
        prefix: getCurrencySymbol(targetCurrency),
      },
      {
        label: "Spending",
        ytd: expenditureYTDConverted,
        alltime: expenditureAllTimeConverted,
        prefix: getCurrencySymbol(targetCurrency),
      },
      {
        label: "Saved",
        ytd: savingsYTDConverted,
        alltime: savingsAllTimeConverted,
        prefix: getCurrencySymbol(targetCurrency),
      },
    ];
  }, [
    incomeYTDConverted,
    incomeAllTimeConverted,
    expenditureYTDConverted,
    expenditureAllTimeConverted,
    savingsYTDConverted,
    savingsAllTimeConverted,
    targetCurrency,
  ]);

  // Format amount with masking support
  const formatAmount = (amount: number) => {
    if (isMasked) {
      return "••••";
    }
    return formatCurrency(amount);
  };

  return (
    <div className="flex items-center gap-4 overflow-x-auto sm:gap-6">
      {metricsData.map((metric, index) => (
        <div key={index} className="flex items-center gap-4">
          {/* Individual Metric */}
          <div className="flex flex-col gap-0.5">
            {/* Metric Label */}
            <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
              {metric.label}:
            </span>

            {/* Metric Values - Show both YTD and All-Time side by side */}
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-xs tabular-nums text-foreground">
                {metric.prefix}
                {formatAmount(metric.ytd)}
              </span>
              <span className="text-muted-foreground/60">|</span>
              <span className="text-xs tabular-nums text-foreground">
                {metric.prefix}
                {formatAmount(metric.alltime)}
              </span>
            </div>
          </div>

          {/* Vertical divider between metrics (not after last one) */}
          {index < metricsData.length - 1 && (
            <div className="h-8 w-px bg-border" />
          )}
        </div>
      ))}

      {/* YTD Percentage - styled like YoY badge from sample-navbar */}
      {metrics.netWorthPercentageYTD !== null && (
        <>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col gap-0.5">
            <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
              YTD:
            </span>
            <span
              className={`whitespace-nowrap text-xs font-semibold tabular-nums ${
                metrics.netWorthPercentageYTD >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {metrics.netWorthPercentageYTD >= 0 ? "+" : ""}
              {metrics.netWorthPercentageYTD.toFixed(1)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}
