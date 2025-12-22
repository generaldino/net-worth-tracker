"use client";

import { useState, useEffect } from "react";
import type { Currency } from "@/lib/fx-rates";
import { convertCurrency } from "@/lib/fx-rates";

export function useCurrencyConversion(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
) {
  const [convertedAmount, setConvertedAmount] = useState<number>(amount);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (fromCurrency === toCurrency) {
      setConvertedAmount(amount);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    convertCurrency(amount, fromCurrency, toCurrency)
      .then((converted) => {
        setConvertedAmount(converted);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Currency conversion error:", error);
        // Fallback to original amount if conversion fails
        setConvertedAmount(amount);
        setIsLoading(false);
      });
  }, [amount, fromCurrency, toCurrency]);

  return { convertedAmount, isLoading };
}

