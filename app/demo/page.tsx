"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { DemoChartSection } from "@/components/demo/demo-chart-section";
import { DemoAccountsSection } from "@/components/demo/demo-accounts-section";
import { useNetWorth } from "@/contexts/net-worth-context";
import {
  calculateDemoNetWorth,
  getDemoNetWorthBreakdown,
  getDemoPercentageIncrease,
  getDemoFinancialMetrics,
} from "@/lib/demo-data";

export default function DemoPage() {
  const { setNetWorthData, setFinancialMetrics } = useNetWorth();

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
      <div className="sticky top-0 z-50 border-b bg-gradient-to-r from-emerald-500/10 via-background to-emerald-500/10 backdrop-blur-sm">
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
              <span className="text-sm text-muted-foreground hidden md:inline">
                Explore with sample data — your real data stays private
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Ready to track your own finances?
              </span>
              <GoogleSignInButton />
            </div>
          </div>
        </div>
      </div>

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

