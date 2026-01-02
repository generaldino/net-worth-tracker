"use client";

import { useEffect, useState } from "react";
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
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useNetWorth } from "@/contexts/net-worth-context";
import {
  calculateDemoNetWorth,
  getDemoNetWorthBreakdown,
  getDemoPercentageIncrease,
  getDemoFinancialMetrics,
} from "@/lib/demo-data";

export default function DemoPage() {
  const { setNetWorthData, setFinancialMetrics } = useNetWorth();
  const { netWorth, netWorthBreakdown, financialMetrics } = useNetWorth();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const [period, setPeriod] = useState<"ytd" | "alltime">("ytd");

  // Set demo data on mount
  useEffect(() => {
    const netWorth = calculateDemoNetWorth();
    const breakdown = getDemoNetWorthBreakdown();
    const percentageIncrease = getDemoPercentageIncrease();
    const metrics = getDemoFinancialMetrics();

    setNetWorthData(netWorth, breakdown, percentageIncrease);
    setFinancialMetrics(metrics);
  }, [setNetWorthData, setFinancialMetrics]);

  return (
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
            <GoogleSignInButton />
          </div>
        </div>
      </div>

      {/* Navbar with Financial Metrics */}
      <nav className="w-full border-b bg-background">
        <div className="w-full max-w-full px-4 sm:px-6 overflow-hidden">
          <div className="flex items-center justify-between gap-2 sm:gap-4 py-3 min-h-[56px] w-full">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              {netWorth !== null && netWorthBreakdown && financialMetrics && (
                <div className="hidden lg:flex items-center gap-3 min-w-0 flex-1">
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
              Sign up for free and start monitoring your net worth in minutes.
              No credit card required.
            </p>
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    </div>
  );
}
