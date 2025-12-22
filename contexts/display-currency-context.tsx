"use client";

import { createContext, useContext, useState, ReactNode } from "react";
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

export function DisplayCurrencyProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [displayCurrency, setDisplayCurrency] =
    useState<DisplayCurrency>("GBP");

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


