"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { DisplayCurrency } from "@/components/currency-selector";
import { setDisplayCurrencyPreference } from "@/lib/preferences";

interface DisplayCurrencyContextType {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
  // Get the effective currency for charts (BASE -> GBP, otherwise the selected currency)
  getChartCurrency: () => string;
}

const DisplayCurrencyContext = createContext<
  DisplayCurrencyContextType | undefined
>(undefined);

interface DisplayCurrencyProviderProps {
  children: ReactNode;
  initialCurrency?: DisplayCurrency; // Passed from server component via cookies
}

export function DisplayCurrencyProvider({
  children,
  initialCurrency = "GBP",
}: DisplayCurrencyProviderProps) {
  const [displayCurrency, setDisplayCurrencyState] =
    useState<DisplayCurrency>(initialCurrency);

  // Set currency - update state immediately (optimistic) and persist to cookie
  const setDisplayCurrency = useCallback((currency: DisplayCurrency) => {
    setDisplayCurrencyState(currency);
    // Fire and forget - persist to cookie via server action
    setDisplayCurrencyPreference(currency).catch(console.error);
  }, []);

  const getChartCurrency = useCallback((): string => {
    // When "Base Currency" is selected, use GBP as default for charts
    if (displayCurrency === "BASE") {
      return "GBP";
    }
    return displayCurrency;
  }, [displayCurrency]);

  return (
    <DisplayCurrencyContext.Provider
      value={{ displayCurrency, setDisplayCurrency, getChartCurrency }}
    >
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  const context = useContext(DisplayCurrencyContext);
  if (context === undefined) {
    throw new Error(
      "useDisplayCurrency must be used within DisplayCurrencyProvider"
    );
  }
  return context;
}
