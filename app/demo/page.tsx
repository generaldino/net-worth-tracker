"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { DemoChartSection } from "@/components/demo/demo-chart-section";
import { DemoAccountsSection } from "@/components/demo/demo-accounts-section";
import { MaskToggleButton } from "@/components/mask-toggle-button";
import { CurrencySelector } from "@/components/currency-selector";
import { FinancialMetricsNavbar } from "@/components/sample-navbar";
import { PeriodSelector } from "@/components/charts/period-selector";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { ChartDataProvider } from "@/contexts/chart-data-context";
import { useUrlState } from "@/hooks/use-url-state";
import { getDemoChartData } from "@/lib/demo-data";
import type { TimePeriod } from "@/lib/types";

export default function DemoPage() {
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const chartData = useMemo(() => getDemoChartData(), []);
  const [period, setPeriod] = useUrlState<TimePeriod>("period", "1Y");

  return (
    <ChartDataProvider data={chartData}>
      <div className="min-h-screen bg-background">
        {/* Demo Banner */}
        <div className="border-b bg-gradient-to-r from-emerald-500/10 via-background to-emerald-500/10">
          <div className="container mx-auto px-4 sm:px-6 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back to Home</span>
                  </Button>
                </Link>
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Demo Mode
                </Badge>
              </div>
              <GoogleSignInButton compact />
            </div>
          </div>
        </div>

        {/* Navbar with Financial Metrics + Period selector */}
        <nav className="w-full border-b bg-background">
          <div className="w-full max-w-full px-4 sm:px-6 overflow-hidden">
            <div className="flex items-center justify-between gap-2 sm:gap-4 py-3 min-h-[56px] w-full">
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <div className="hidden lg:flex items-center gap-3 min-w-0 flex-1">
                  <FinancialMetricsNavbar />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <div className="hidden md:block">
                  <PeriodSelector value={period} onChange={setPeriod} />
                </div>
                <CurrencySelector
                  value={displayCurrency}
                  onValueChange={setDisplayCurrency}
                />
                <MaskToggleButton />
              </div>
            </div>
            {/* Mobile/tablet financial metrics display */}
            <div className="lg:hidden pb-3 border-t pt-3 mt-2 space-y-3">
              <FinancialMetricsNavbar />
              <div className="flex justify-center md:hidden">
                <PeriodSelector value={period} onChange={setPeriod} />
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="space-y-6">
            <DemoChartSection />
            <DemoAccountsSection />
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="border-t bg-muted/20 mt-12">
          <div className="container mx-auto px-4 sm:px-6 py-12">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Ready to track your own wealth?
              </h2>
              <p className="text-muted-foreground mb-6">
                Sign up for free and start monitoring your net worth in
                minutes. No credit card required.
              </p>
              <GoogleSignInButton />
            </div>
          </div>
        </div>
      </div>
    </ChartDataProvider>
  );
}
