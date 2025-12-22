"use client";

import type { ChartData } from "@/components/charts/types";
import type { Currency } from "@/lib/fx-rates";
import { useExchangeRates } from "@/contexts/exchange-rates-context";

/**
 * Client-side currency conversion for chart data
 * This is instant since it's just math using pre-loaded rates
 */
export function useChartCurrencyConverter() {
  const { getRate } = useExchangeRates();

  const convertChartData = (
    data: ChartData,
    displayCurrency: Currency
  ): ChartData => {
    // Helper to convert monthKey from "YYYY-MM-DD" to "YYYY-MM" format
    const toMonthFormat = (monthKey: string): string => {
      // If already in YYYY-MM format, return as is
      if (/^\d{4}-\d{2}$/.test(monthKey)) {
        return monthKey;
      }
      // If in YYYY-MM-DD format, extract YYYY-MM
      if (/^\d{4}-\d{2}-\d{2}$/.test(monthKey)) {
        return monthKey.substring(0, 7);
      }
      return monthKey;
    };

    // Helper to convert a value using stored rates
    const convertValue = (
      amount: number,
      fromCurrency: Currency,
      monthKey: string
    ): number => {
      if (fromCurrency === displayCurrency) {
        return amount;
      }

      const month = toMonthFormat(monthKey);
      const fromRate = getRate(month, fromCurrency);
      const toRate = getRate(month, displayCurrency);

      if (fromRate === null || toRate === null) {
        // Rates not loaded yet, return original
        return amount;
      }

      // Convert: amount in fromCurrency -> GBP -> toCurrency
      // Rates are stored as: 1 GBP = X EUR, 1 GBP = Y USD, etc.
      let amountInGbp: number;
      if (fromCurrency === "GBP") {
        amountInGbp = amount;
      } else {
        amountInGbp = amount / fromRate;
      }

      let amountInTarget: number;
      if (displayCurrency === "GBP") {
        amountInTarget = amountInGbp;
      } else {
        amountInTarget = amountInGbp * toRate;
      }

      return amountInTarget;
    };

    // Convert net worth data
    const convertedNetWorthData = data.netWorthData.map((item) => {
      if (!item.accountBalances || !item.monthKey) {
        // Fallback if structure is different - return as is but ensure monthKey exists
        return {
          month: item.month,
          monthKey: item.monthKey || item.month.substring(0, 7), // Extract YYYY-MM from month if needed
          netWorth: item.netWorth,
        };
      }

      const convertedNetWorth = item.accountBalances.reduce((sum, acc) => {
        const converted = convertValue(acc.balance, acc.currency as Currency, item.monthKey);
        return sum + (acc.isLiability ? -converted : converted);
      }, 0);

      return {
        month: item.month,
        monthKey: item.monthKey,
        netWorth: convertedNetWorth,
      };
    });

    // Convert account data
    const convertedAccountData = data.accountData.map((item) => {
      const converted: typeof item = { ...item };
      
      // Convert each account value
      Object.keys(item).forEach((key) => {
        if (key === "month" || key === "monthKey") return;
        
        if (key.endsWith("_currency")) {
          // Remove currency metadata keys
          delete converted[key];
          return;
        }

        const currencyKey = `${key}_currency`;
        const currency = (item[currencyKey] as string) || "GBP";
        const value = item[key] as number;

        if (typeof value === "number") {
          converted[key] = convertValue(
            Math.abs(value),
            currency as Currency,
            item.monthKey
          ) * (value < 0 ? -1 : 1);
        }
      });

      return converted;
    });

    // Convert account type data
    const convertedAccountTypeData = data.accountTypeData.map((item) => {
      const converted: typeof item = { ...item };
      
      Object.keys(item).forEach((key) => {
        if (key === "month" || key === "monthKey" || key.endsWith("_currencies")) {
          if (key.endsWith("_currencies")) {
            delete converted[key];
          }
          return;
        }

        const currenciesKey = `${key}_currencies`;
        const currenciesJson = item[currenciesKey] as string;
        
        if (currenciesJson) {
          try {
            const currencies = JSON.parse(currenciesJson) as Array<{
              currency: Currency;
              balance: number;
              isLiability: boolean;
            }>;
            
            const convertedTotal = currencies.reduce((sum, curr) => {
              const converted = convertValue(curr.balance, curr.currency, item.monthKey);
              return sum + (curr.isLiability ? -converted : converted);
            }, 0);
            
            converted[key] = convertedTotal;
          } catch {
            // Fallback if parsing fails
          }
        }
      });

      return converted;
    });

    // Convert category data (same logic as account type)
    const convertedCategoryData = data.categoryData.map((item) => {
      const converted: typeof item = { ...item };
      
      Object.keys(item).forEach((key) => {
        if (key === "month" || key === "monthKey" || key.endsWith("_currencies")) {
          if (key.endsWith("_currencies")) {
            delete converted[key];
          }
          return;
        }

        const currenciesKey = `${key}_currencies`;
        const currenciesJson = item[currenciesKey] as string;
        
        if (currenciesJson) {
          try {
            const currencies = JSON.parse(currenciesJson) as Array<{
              currency: Currency;
              balance: number;
              isLiability: boolean;
            }>;
            
            const convertedTotal = currencies.reduce((sum, curr) => {
              const converted = convertValue(curr.balance, curr.currency, item.monthKey);
              return sum + (curr.isLiability ? -converted : converted);
            }, 0);
            
            converted[key] = convertedTotal;
          } catch {
            // Fallback if parsing fails
          }
        }
      });

      return converted;
    });

    // Convert source data
    const convertedSourceData = data.sourceData.map((item) => {
      const converted = { ...item };
      
      // Convert breakdown amounts
      if (item.breakdown) {
        const convertedBreakdown: typeof item.breakdown = {
          "Savings from Income": item.breakdown["Savings from Income"].map((acc) => ({
            ...acc,
            amount: convertValue(acc.amount, acc.currency as Currency, item.monthKey),
          })),
          "Interest Earned": item.breakdown["Interest Earned"].map((acc) => ({
            ...acc,
            amount: convertValue(acc.amount, acc.currency as Currency, item.monthKey),
          })),
          "Capital Gains": item.breakdown["Capital Gains"].map((acc) => ({
            ...acc,
            amount: convertValue(acc.amount, acc.currency as Currency, item.monthKey),
          })),
        };

        // Recalculate totals from converted breakdowns
        converted["Savings from Income"] = convertedBreakdown["Savings from Income"].reduce(
          (sum, acc) => sum + acc.amount,
          0
        );
        converted["Interest Earned"] = convertedBreakdown["Interest Earned"].reduce(
          (sum, acc) => sum + acc.amount,
          0
        );
        converted["Capital Gains"] = convertedBreakdown["Capital Gains"].reduce(
          (sum, acc) => sum + acc.amount,
          0
        );
        converted["Total Income"] = item.breakdown["Savings from Income"].reduce(
          (sum, acc) => sum + convertValue(acc.amount, acc.currency as Currency, item.monthKey),
          0
        );
        
        // Recalculate savings rate
        converted["Savings Rate"] =
          converted["Total Income"] > 0
            ? Number(
                (
                  (Math.abs(converted["Savings from Income"]) /
                    converted["Total Income"]) *
                  100
                ).toFixed(1)
              )
            : 0;

        converted.breakdown = convertedBreakdown;
      }

      return converted;
    });

    return {
      ...data,
      netWorthData: convertedNetWorthData,
      accountData: convertedAccountData,
      accountTypeData: convertedAccountTypeData,
      categoryData: convertedCategoryData,
      sourceData: convertedSourceData,
    };
  };

  return { convertChartData };
}

