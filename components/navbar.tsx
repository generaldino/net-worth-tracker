"use client";

import { useState, useEffect } from "react";
import { MaskToggleButton } from "@/components/mask-toggle-button";
import { CurrencySelector } from "@/components/currency-selector";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useNetWorth } from "@/contexts/net-worth-context";
import { FinancialMetricsNavbar } from "@/components/sample-navbar";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Navbar() {
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const { netWorth, netWorthBreakdown, financialMetrics } = useNetWorth();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [period, setPeriod] = useState<"ytd" | "alltime">("ytd");

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
      className={`sticky top-0 z-40 w-full max-w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ${
        isMobile && !isVisible ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="w-full max-w-full px-4 sm:px-6 overflow-hidden">
        <div className="flex items-center justify-between gap-2 sm:gap-4 py-3 min-h-[56px] w-full">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <SidebarTrigger className="-ml-1" />
            {netWorth !== null && netWorthBreakdown && financialMetrics && (
              <div className="hidden lg:flex items-center gap-3 min-w-0 flex-1">
                <div className="border-l h-8 ml-2" />
                <FinancialMetricsNavbar period={period} />
                <div className="border-l h-8" />
                <div className="flex shrink-0 items-center">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPeriod("ytd")}
                      className={`h-7 w-20 px-3 text-xs font-medium ${
                        period === "ytd"
                          ? "text-foreground font-semibold hover:bg-accent"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      YTD
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPeriod("alltime")}
                      className={`h-7 w-20 px-3 text-xs font-medium ${
                        period === "alltime"
                          ? "text-foreground font-semibold hover:bg-accent"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      All Time
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <CurrencySelector
              value={displayCurrency}
              onValueChange={setDisplayCurrency}
            />
            <MaskToggleButton />
          </div>
        </div>
        {/* Mobile/tablet financial metrics display */}
        {netWorth !== null && netWorthBreakdown && financialMetrics && (
          <div className="lg:hidden pb-3 border-t pt-3 mt-2">
            <FinancialMetricsNavbar period={period} setPeriod={setPeriod} />
            <div className="flex justify-center mt-3">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPeriod("ytd")}
                  className={`h-7 px-3 text-xs font-medium ${
                    period === "ytd"
                      ? "text-foreground font-semibold hover:bg-accent"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  YTD
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPeriod("alltime")}
                  className={`h-7 px-3 text-xs font-medium ${
                    period === "alltime"
                      ? "text-foreground font-semibold hover:bg-accent"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  All Time
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
