"use client";

import { NetWorthDisplay } from "@/components/net-worth-display";
import { CurrencySelector } from "@/components/currency-selector";
import { MaskToggleButton } from "@/components/mask-toggle-button";
import { useDisplayCurrency } from "@/contexts/display-currency-context";

interface NetWorthBreakdown {
  accountBalances: Array<{
    accountId: string;
    balance: number;
    currency: string;
    isLiability: boolean;
  }>;
  monthKey: string;
}

export function DashboardHeader({
  netWorth,
  netWorthBreakdown,
  percentageIncrease,
}: {
  netWorth: number;
  netWorthBreakdown: NetWorthBreakdown;
  percentageIncrease: number | null;
}) {
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="text-center sm:text-left w-full sm:w-auto">
          <NetWorthDisplay
            netWorth={netWorth}
            netWorthBreakdown={netWorthBreakdown}
            percentageIncrease={percentageIncrease}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
          <CurrencySelector
            value={displayCurrency}
            onValueChange={setDisplayCurrency}
          />
          <MaskToggleButton />
        </div>
      </div>
    </div>
  );
}


