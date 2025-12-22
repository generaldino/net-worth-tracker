"use client";

import { useState, useEffect } from "react";
import type { Currency } from "@/lib/fx-rates";
import { useExchangeRates } from "@/contexts/exchange-rates-context";

/**
 * Client-side currency conversion using stored exchange rates
 * This is instant since it's just math, no server calls
 */
export function useCurrencyConversion(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  forMonth?: string // Format: "YYYY-MM" for historical conversion
) {
  const { getRate } = useExchangeRates();
  const [convertedAmount, setConvertedAmount] = useState<number>(amount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (fromCurrency === toCurrency) {
      setConvertedAmount(amount);
      setIsLoading(false);
      return;
    }

    // Use latest rates if no month specified, otherwise use historical rates
    const monthToUse = forMonth || "latest";
    
    // Get the rate for the target currency (rates are stored as GBP base)
    // If we need historical rates, use the month; otherwise use latest
    const targetRate = getRate(monthToUse, toCurrency);
    const fromRate = getRate(monthToUse, fromCurrency);

    if (targetRate === null || fromRate === null) {
      // Rates not loaded yet, keep original amount
      setIsLoading(true);
      setConvertedAmount(amount);
      return;
    }

    // Convert: amount in fromCurrency -> GBP -> toCurrency
    // Rates are stored as: 1 GBP = X EUR, 1 GBP = Y USD, etc.
    // So: 1 EUR = 1/X GBP, 1 USD = 1/Y GBP
    
    // Convert fromCurrency to GBP
    let amountInGbp: number;
    if (fromCurrency === "GBP") {
      amountInGbp = amount;
    } else {
      // If fromCurrency is EUR, and fromRate = 1.15, then 1 EUR = 1/1.15 GBP
      amountInGbp = amount / fromRate;
    }

    // Convert GBP to toCurrency
    let amountInTarget: number;
    if (toCurrency === "GBP") {
      amountInTarget = amountInGbp;
    } else {
      // If toCurrency is EUR, and targetRate = 1.15, then 1 GBP = 1.15 EUR
      amountInTarget = amountInGbp * targetRate;
    }

    setConvertedAmount(amountInTarget);
    setIsLoading(false);
  }, [amount, fromCurrency, toCurrency, forMonth, getRate]);

  return { convertedAmount, isLoading };
}

