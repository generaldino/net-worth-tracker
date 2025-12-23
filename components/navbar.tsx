"use client";

import { ProfileDropdown } from "@/components/auth/profile-dropdown";
import { MaskToggleButton } from "@/components/mask-toggle-button";
import { CurrencySelector } from "@/components/currency-selector";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useNetWorth } from "@/contexts/net-worth-context";
import { NetWorthDisplay } from "@/components/net-worth-display";

export function Navbar() {
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const { netWorth, netWorthBreakdown, percentageIncrease } = useNetWorth();

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3 min-h-[56px]">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="font-semibold text-base sm:text-lg shrink-0">
              💰 Wealth Tracker
            </div>
            {netWorth !== null && netWorthBreakdown && (
              <div className="hidden md:flex items-center gap-3 min-w-0 flex-1">
                <div className="border-l h-8" />
                <NetWorthDisplay
                  netWorth={netWorth}
                  netWorthBreakdown={netWorthBreakdown}
                  percentageIncrease={percentageIncrease}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CurrencySelector
              value={displayCurrency}
              onValueChange={setDisplayCurrency}
            />
            <MaskToggleButton />
            <ProfileDropdown />
          </div>
        </div>
        {/* Mobile net worth display */}
        {netWorth !== null && netWorthBreakdown && (
          <div className="md:hidden pb-3 border-t pt-3 mt-2">
            <NetWorthDisplay
              netWorth={netWorth}
              netWorthBreakdown={netWorthBreakdown}
              percentageIncrease={percentageIncrease}
            />
          </div>
        )}
      </div>
    </nav>
  );
}
