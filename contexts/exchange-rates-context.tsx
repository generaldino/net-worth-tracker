"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import type { Currency } from "@/lib/fx-rates";
import { fetchExchangeRatesForMonths } from "@/lib/actions";

export interface ExchangeRate {
  date: string; // Format: "YYYY-MM-DD" (last day of month)
  gbpRate: number;
  eurRate: number;
  usdRate: number;
  aedRate: number;
}

interface ExchangeRatesContextType {
  rates: Record<string, ExchangeRate>; // Key: "YYYY-MM-DD", Value: ExchangeRate
  isLoading: boolean;
  error: string | null;
  fetchRates: (months: string[]) => Promise<void>; // months in "YYYY-MM" format
  getRate: (month: string, currency: Currency) => number | null; // month in "YYYY-MM" format
}

const ExchangeRatesContext = createContext<
  ExchangeRatesContextType | undefined
>(undefined);

interface ExchangeRatesProviderProps {
  children: ReactNode;
  // Accept pre-fetched rates from server (SSR-friendly)
  initialRates?: Record<string, ExchangeRate>;
}

export function ExchangeRatesProvider({
  children,
  initialRates = {},
}: ExchangeRatesProviderProps) {
  // Initialize with server-provided rates (no useEffect needed for initial load!)
  const [rates, setRates] = useState<Record<string, ExchangeRate>>(initialRates);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to track rates so fetchRates doesn't need to depend on rates
  const ratesRef = useRef(rates);
  ratesRef.current = rates;

  const fetchRates = useCallback(async (months: string[]) => {
    if (months.length === 0) return;

    // Check which months we already have using the ref
    const missingMonths = months.filter((month) => {
      const lastDay = getLastDayOfMonth(month);
      return !ratesRef.current[lastDay];
    });

    if (missingMonths.length === 0) {
      // All rates already loaded
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedRates = await fetchExchangeRatesForMonths(missingMonths);

      // Convert to our format and merge with existing rates
      setRates((prevRates) => {
        const newRates: Record<string, ExchangeRate> = { ...prevRates };
        fetchedRates.forEach((rate) => {
          newRates[rate.date] = {
            date: rate.date,
            gbpRate: Number(rate.gbpRate),
            eurRate: Number(rate.eurRate),
            usdRate: Number(rate.usdRate),
            aedRate: Number(rate.aedRate),
          };
        });
        return newRates;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch exchange rates"
      );
      console.error("Error fetching exchange rates:", err);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps - function is stable now

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

  return (
    <ExchangeRatesContext.Provider
      value={{ rates, isLoading, error, fetchRates, getRate }}
    >
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
