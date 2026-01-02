"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface NetWorthBreakdown {
  accountBalances: Array<{
    accountId: string;
    balance: number;
    currency: string;
    isLiability: boolean;
  }>;
  monthKey: string;
}

interface FinancialMetrics {
  netWorthYTD: number;
  netWorthAllTime: number;
  netWorthPercentageYTD: number | null;
  netWorthPercentageAllTime: number | null;
  incomeYTD: number;
  incomeAllTime: number;
  incomePercentageYTD: number | null;
  incomePercentageAllTime: number | null;
  expenditureYTD: number;
  expenditureAllTime: number;
  expenditurePercentageYTD: number | null;
  expenditurePercentageAllTime: number | null;
  savingsYTD: number;
  savingsAllTime: number;
  savingsPercentageYTD: number | null;
  savingsPercentageAllTime: number | null;
  savingsRateYTD: number | null;
  savingsRateAllTime: number | null;
  spendingRateYTD: number | null;
  spendingRateAllTime: number | null;
  incomeBreakdownYTD: Array<{ currency: string; amount: number }>;
  incomeBreakdownAllTime: Array<{ currency: string; amount: number }>;
  expenditureBreakdownYTD: Array<{ currency: string; amount: number }>;
  expenditureBreakdownAllTime: Array<{ currency: string; amount: number }>;
  latestMonth: string | null;
}

interface NetWorthContextType {
  netWorth: number | null;
  netWorthBreakdown: NetWorthBreakdown | null;
  percentageIncrease: number | null;
  financialMetrics: FinancialMetrics | null;
  setNetWorthData: (
    netWorth: number,
    breakdown: NetWorthBreakdown,
    percentageIncrease: number | null
  ) => void;
  setFinancialMetrics: (metrics: FinancialMetrics) => void;
}

const NetWorthContext = createContext<NetWorthContextType | undefined>(
  undefined
);

export function NetWorthProvider({ children }: { children: ReactNode }) {
  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [netWorthBreakdown, setNetWorthBreakdown] =
    useState<NetWorthBreakdown | null>(null);
  const [percentageIncrease, setPercentageIncrease] = useState<number | null>(
    null
  );
  const [financialMetrics, setFinancialMetrics] =
    useState<FinancialMetrics | null>(null);

  const setNetWorthData = useCallback(
    (
      netWorth: number,
      breakdown: NetWorthBreakdown,
      percentageIncrease: number | null
    ) => {
      setNetWorth(netWorth);
      setNetWorthBreakdown(breakdown);
      setPercentageIncrease(percentageIncrease);
    },
    []
  );

  const setFinancialMetricsCallback = useCallback(
    (metrics: FinancialMetrics) => {
      setFinancialMetrics(metrics);
    },
    []
  );

  return (
    <NetWorthContext.Provider
      value={{
        netWorth,
        netWorthBreakdown,
        percentageIncrease,
        financialMetrics,
        setNetWorthData,
        setFinancialMetrics: setFinancialMetricsCallback,
      }}
    >
      {children}
    </NetWorthContext.Provider>
  );
}

export function useNetWorth() {
  const context = useContext(NetWorthContext);
  if (context === undefined) {
    throw new Error("useNetWorth must be used within a NetWorthProvider");
  }
  return context;
}
