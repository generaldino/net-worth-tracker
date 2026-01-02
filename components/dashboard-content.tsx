"use client";

import { useDemo } from "@/contexts/demo-context";
import { useEffect } from "react";
import { useNetWorth } from "@/contexts/net-worth-context";
import { DemoChartSection } from "@/components/demo/demo-chart-section";
import { DemoAccountsSection } from "@/components/demo/demo-accounts-section";
import {
  calculateDemoNetWorth,
  getDemoNetWorthBreakdown,
  getDemoPercentageIncrease,
  getDemoFinancialMetrics,
} from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

interface DashboardContentProps {
  children: React.ReactNode;
}

export function DashboardContent({ children }: DashboardContentProps) {
  const { isDemoMode } = useDemo();
  const { setNetWorthData, setFinancialMetrics } = useNetWorth();

  // Set demo data when demo mode is enabled
  useEffect(() => {
    if (isDemoMode) {
      const netWorth = calculateDemoNetWorth();
      const breakdown = getDemoNetWorthBreakdown();
      const percentageIncrease = getDemoPercentageIncrease();
      const metrics = getDemoFinancialMetrics();

      setNetWorthData(netWorth, breakdown, percentageIncrease);
      setFinancialMetrics(metrics);
    }
  }, [isDemoMode, setNetWorthData, setFinancialMetrics]);

  if (isDemoMode) {
    return (
      <div className="min-h-[calc(100svh-56px)] bg-background overflow-x-hidden max-w-full">
        {/* Demo Mode Banner */}
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <FlaskConical className="w-4 h-4" />
            <span className="font-medium">Demo Mode</span>
            <Badge
              variant="outline"
              className="text-xs bg-emerald-500/10 border-emerald-500/30"
            >
              Sample Data
            </Badge>
            <span className="text-muted-foreground">
              — Toggle off in the sidebar to see your real data
            </span>
          </div>
        </div>

        <div className="w-full max-w-full py-4 px-4 sm:px-6">
          <div className="space-y-4 sm:space-y-6">
            <DemoChartSection />
            <DemoAccountsSection />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

