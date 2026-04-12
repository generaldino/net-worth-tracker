"use client";

import { useState, useEffect, useRef } from "react";
import { MaskToggleButton } from "@/components/mask-toggle-button";
import { CurrencySelector } from "@/components/currency-selector";
import { AssistantTriggerButton } from "@/components/assistant/assistant-trigger-button";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartData } from "@/contexts/chart-data-context";
import { FinancialMetricsNavbar } from "@/components/sample-navbar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PeriodSelector } from "@/components/charts/period-selector";
import { AccountFilter } from "@/components/charts/account-filter";
import { useUrlState } from "@/hooks/use-url-state";
import type { TimePeriod } from "@/lib/types";

export function Navbar() {
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const chartData = useChartData();
  const [period, setPeriod] = useUrlState<TimePeriod>("period", "1Y");
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  // Scroll bookkeeping lives in refs so scroll events don't re-subscribe the
  // listener on every tick.
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsVisible(true);
      return;
    }

    const update = () => {
      const currentScrollY = window.scrollY;
      const last = lastScrollYRef.current;
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > last && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < last) {
        setIsVisible(true);
      }
      lastScrollYRef.current = currentScrollY;
      tickingRef.current = false;
    };

    const onScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  const hasChartData = !!chartData && chartData.sourceData.length > 0;

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
            {hasChartData && (
              <div className="hidden lg:flex items-center gap-3 min-w-0 flex-1">
                <div className="border-l h-8 ml-2" />
                <FinancialMetricsNavbar />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {hasChartData && (
              <div className="hidden md:flex items-center gap-2">
                <PeriodSelector value={period} onChange={setPeriod} />
                <AccountFilter />
              </div>
            )}
            <CurrencySelector
              value={displayCurrency}
              onValueChange={setDisplayCurrency}
            />
            <MaskToggleButton />
            <AssistantTriggerButton />
          </div>
        </div>
        {/* Mobile/tablet display */}
        {hasChartData && (
          <div className="lg:hidden pb-3 border-t pt-3 mt-2 space-y-3">
            <FinancialMetricsNavbar />
            <div className="flex justify-center gap-2 md:hidden">
              <PeriodSelector value={period} onChange={setPeriod} />
              <AccountFilter />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
