"use client";

import { useMasking } from "@/contexts/masking-context";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { formatCurrencyAmount, formatPercentage } from "@/lib/fx-rates";
import { useExchangeRates } from "@/contexts/exchange-rates-context";
import { useEffect, useMemo } from "react";
import type { Currency } from "@/lib/fx-rates";

interface NetWorthBreakdown {
  accountBalances: Array<{
    accountId: string;
    balance: number;
    currency: string;
    isLiability: boolean;
  }>;
  monthKey: string;
}

interface NetWorthDisplayProps {
  netWorth: number;
  netWorthBreakdown: NetWorthBreakdown;
  percentageIncrease: number | null;
}

export function NetWorthDisplay({
  netWorth,
  netWorthBreakdown,
  percentageIncrease,
}: NetWorthDisplayProps) {
  const { displayCurrency } = useDisplayCurrency();
  const { getRate, fetchRates } = useExchangeRates();
  const { isMasked } = useMasking();

  // Fetch rates for the latest month when component mounts
  useEffect(() => {
    if (displayCurrency !== "BASE" && netWorthBreakdown.monthKey) {
      // Convert monthKey from "YYYY-MM-DD" to "YYYY-MM" if needed
      const month = /^\d{4}-\d{2}$/.test(netWorthBreakdown.monthKey)
        ? netWorthBreakdown.monthKey
        : netWorthBreakdown.monthKey.substring(0, 7);
      fetchRates([month]);
    }
  }, [displayCurrency, netWorthBreakdown.monthKey, fetchRates]);

  // Convert net worth to display currency
  const convertedNetWorth = useMemo(() => {
    if (displayCurrency === "BASE") {
      // For base currency, return original net worth
      return netWorth;
    }

    const targetCurrency = displayCurrency as Currency;
    const month = /^\d{4}-\d{2}$/.test(netWorthBreakdown.monthKey)
      ? netWorthBreakdown.monthKey
      : netWorthBreakdown.monthKey.substring(0, 7);

    // Convert each account balance and sum them
    const convertedTotal = netWorthBreakdown.accountBalances.reduce(
      (sum, acc) => {
        const accountCurrency = acc.currency as Currency;
        if (accountCurrency === targetCurrency) {
          return sum + (acc.isLiability ? -acc.balance : acc.balance);
        }

        // Get exchange rates
        const fromRate = getRate(month, accountCurrency);
        const toRate = getRate(month, targetCurrency);

        if (fromRate === null || toRate === null) {
          // Rates not loaded yet, return original balance
          return sum + (acc.isLiability ? -acc.balance : acc.balance);
        }

        // Convert: amount in fromCurrency -> GBP -> toCurrency
        let amountInGbp: number;
        if (accountCurrency === "GBP") {
          amountInGbp = acc.balance;
        } else {
          amountInGbp = acc.balance / fromRate;
        }

        let amountInTarget: number;
        if (targetCurrency === "GBP") {
          amountInTarget = amountInGbp;
        } else {
          amountInTarget = amountInGbp * toRate;
        }

        return sum + (acc.isLiability ? -amountInTarget : amountInTarget);
      },
      0
    );

    return convertedTotal;
  }, [
    displayCurrency,
    netWorth,
    netWorthBreakdown,
    getRate,
  ]);

  // Format the amount
  const currency = displayCurrency === "BASE" ? "GBP" : (displayCurrency as Currency);
  const formattedAmount = isMasked
    ? "••••••"
    : formatCurrencyAmount(convertedNetWorth, currency);

  // Format percentage increase (always visible, not masked)
  const formattedPercentage = percentageIncrease !== null
    ? formatPercentage(percentageIncrease, { showSign: true })
    : null;

  return (
    <div className="flex items-baseline gap-2 sm:gap-3">
      <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">
        {formattedAmount}
      </div>
      {formattedPercentage && percentageIncrease !== null && (
        <div
          className={`text-sm sm:text-base lg:text-lg font-semibold font-mono tabular-nums ${
            percentageIncrease >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {formattedPercentage}
        </div>
      )}
    </div>
  );
}

