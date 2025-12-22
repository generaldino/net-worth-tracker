"use client";

import { useState, useEffect } from "react";
import type { Currency } from "@/lib/fx-rates";
import { convertCurrency } from "@/lib/actions";

export function useCurrencyConversion(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  forMonth?: string // Format: "YYYY-MM" for historical conversion
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
    convertCurrency(amount, fromCurrency, toCurrency, forMonth)
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
  }, [amount, fromCurrency, toCurrency, forMonth]);

  return { convertedAmount, isLoading };
}

