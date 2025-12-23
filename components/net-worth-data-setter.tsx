"use client";

import { useEffect } from "react";
import { useNetWorth } from "@/contexts/net-worth-context";

interface NetWorthBreakdown {
  accountBalances: Array<{
    accountId: string;
    balance: number;
    currency: string;
    isLiability: boolean;
  }>;
  monthKey: string;
}

export function NetWorthDataSetter({
  netWorth,
  netWorthBreakdown,
  percentageIncrease,
}: {
  netWorth: number;
  netWorthBreakdown: NetWorthBreakdown;
  percentageIncrease: number | null;
}) {
  const { setNetWorthData } = useNetWorth();

  useEffect(() => {
    setNetWorthData(netWorth, netWorthBreakdown, percentageIncrease);
  }, [netWorth, netWorthBreakdown, percentageIncrease, setNetWorthData]);

  return null;
}

