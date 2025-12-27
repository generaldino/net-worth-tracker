"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfileDropdown } from "@/components/auth/profile-dropdown";
import { MaskToggleButton } from "@/components/mask-toggle-button";
import { CurrencySelector } from "@/components/currency-selector";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useNetWorth } from "@/contexts/net-worth-context";
import { NetWorthDisplay } from "@/components/net-worth-display";

export function Navbar() {
  const router = useRouter();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const { netWorth, netWorthBreakdown, percentageIncrease } = useNetWorth();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Only apply scroll behavior on mobile
    if (!isMobile) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show navbar when at top
      if (currentScrollY < 10) {
        setIsVisible(true);
      }
      // Hide on scroll down, show on scroll up
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkMobile);
    };
  }, [lastScrollY, isMobile]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-transform duration-300 ${
        isMobile && !isVisible ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3 min-h-[56px] w-full">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => router.push("/")}
              className="font-semibold text-base sm:text-lg shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
            >
              💰 Wealth Tracker
            </button>
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
          <div className="flex items-center gap-2 shrink-0 ml-auto">
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
