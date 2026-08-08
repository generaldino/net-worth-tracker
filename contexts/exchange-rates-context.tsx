"use client";

import { createContext, useContext, useMemo, useState, useCallback, ReactNode } from "react";
import type { Currency } from "@/lib/fx-rates";

export interface ExchangeRate {
  date: string; // Format: "YYYY-MM-DD" (last day of month)
  gbpRate: number;
  eurRate: number;
  usdRate: number;
  aedRate: number;
}

interface ExchangeRatesContextType {
  rates: Record<string, ExchangeRate>; // Key: "YYYY-MM-DD", Value: ExchangeRate
  getRate: (month: string, currency: Currency) => number | null; // month in "YYYY-MM" format
}

const ExchangeRatesContext = createContext<
  ExchangeRatesContextType | undefined
>(undefined);

interface ExchangeRatesProviderProps {
  children: ReactNode;
  // Every stored rate, pre-fetched on the server. Rates are manual-entry
  // only, so the stored set is the complete set — no lazy loading needed.
  initialRates?: Record<string, ExchangeRate>;
}

export function ExchangeRatesProvider({
  children,
  initialRates = {},
}: ExchangeRatesProviderProps) {
  const [rates] = useState<Record<string, ExchangeRate>>(initialRates);

  const getRate = useCallback((month: string, currency: Currency): number | null => {
    // Handle "latest" by using the most recent rate
    if (month === "latest") {
      const rateEntries = Object.values(rates);
      if (rateEntries.length === 0) return null;

      // Sort by date and get the most recent
      const latestRate = rateEntries.sort((a, b) =>
        b.date.localeCompare(a.date)
      )[0];

      switch (currency) {
        case "GBP":
          return latestRate.gbpRate;
        case "EUR":
          return latestRate.eurRate;
        case "USD":
          return latestRate.usdRate;
        case "AED":
          return latestRate.aedRate;
        default:
          return null;
      }
    }

    // Handle specific month
    const lastDay = getLastDayOfMonth(month);
    const rate = rates[lastDay];
    if (!rate) return null;

    switch (currency) {
      case "GBP":
        return rate.gbpRate;
      case "EUR":
        return rate.eurRate;
      case "USD":
        return rate.usdRate;
      case "AED":
        return rate.aedRate;
      default:
        return null;
    }
  }, [rates]);

  const value = useMemo(() => ({ rates, getRate }), [rates, getRate]);

  return (
    <ExchangeRatesContext.Provider value={value}>
      {children}
    </ExchangeRatesContext.Provider>
  );
}

export function useExchangeRates() {
  const context = useContext(ExchangeRatesContext);
  if (context === undefined) {
    throw new Error(
      "useExchangeRates must be used within ExchangeRatesProvider"
    );
  }
  return context;
}

/**
 * Get the last day of a month from a YYYY-MM date string
 */
function getLastDayOfMonth(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  // Use Date.UTC to avoid timezone shifts in the browser
  const lastDay = new Date(Date.UTC(year, monthNum, 0));
  return lastDay.toISOString().split("T")[0];
}

// Export the ExchangeRate type for use in server components
export type { ExchangeRate as ExchangeRateType };
