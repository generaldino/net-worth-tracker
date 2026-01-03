"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { DisplayCurrency } from "@/components/currency-selector";

interface DisplayCurrencyContextType {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
  // Get the effective currency for charts (BASE -> GBP, otherwise the selected currency)
  getChartCurrency: () => string;
}

const DisplayCurrencyContext = createContext<
  DisplayCurrencyContextType | undefined
>(undefined);

const DISPLAY_CURRENCY_KEY = "displayCurrency";

export function DisplayCurrencyProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [displayCurrency, setDisplayCurrencyState] =
    useState<DisplayCurrency>("GBP");

  // Load currency preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DISPLAY_CURRENCY_KEY);
    if (saved !== null) {
      setDisplayCurrencyState(saved as DisplayCurrency);
    }
  }, []);

  // Save currency preference to localStorage when changed
  const setDisplayCurrency = (currency: DisplayCurrency) => {
    setDisplayCurrencyState(currency);
    localStorage.setItem(DISPLAY_CURRENCY_KEY, currency);
  };

  const getChartCurrency = (): string => {
    // When "Base Currency" is selected, use GBP as default for charts
    if (displayCurrency === "BASE") {
      return "GBP";
    }
    return displayCurrency;
  };

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


