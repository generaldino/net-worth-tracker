"use client";

import { useEffect } from "react";
import { useNetWorth } from "@/contexts/net-worth-context";

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

export function FinancialMetricsSetter({
  metrics,
}: {
  metrics: FinancialMetrics;
}) {
  const { setFinancialMetrics } = useNetWorth();

  useEffect(() => {
    setFinancialMetrics(metrics);
  }, [metrics, setFinancialMetrics]);

  return null;
}
