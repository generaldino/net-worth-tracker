"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface NetWorthBreakdown {
  accountBalances: Array<{
    accountId: string;
    balance: number;
    currency: string;
    isLiability: boolean;
  }>;
  monthKey: string;
}

interface NetWorthContextType {
  netWorth: number | null;
  netWorthBreakdown: NetWorthBreakdown | null;
  percentageIncrease: number | null;
  setNetWorthData: (
    netWorth: number,
    breakdown: NetWorthBreakdown,
    percentageIncrease: number | null
  ) => void;
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

  const setNetWorthData = (
    netWorth: number,
    breakdown: NetWorthBreakdown,
    percentageIncrease: number | null
  ) => {
    setNetWorth(netWorth);
    setNetWorthBreakdown(breakdown);
    setPercentageIncrease(percentageIncrease);
  };

  return (
    <NetWorthContext.Provider
      value={{
        netWorth,
        netWorthBreakdown,
        percentageIncrease,
        setNetWorthData,
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

