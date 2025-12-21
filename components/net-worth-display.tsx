"use client";

import { useMasking } from "@/contexts/masking-context";

interface NetWorthDisplayProps {
  netWorth: number;
}

export function NetWorthDisplay({ netWorth }: NetWorthDisplayProps) {
  const { formatCurrency } = useMasking();

  return (
    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-green-600">
      £{formatCurrency(netWorth)}
    </div>
  );
}

