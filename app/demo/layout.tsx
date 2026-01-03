import type React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ExchangeRatesProvider } from "@/contexts/exchange-rates-context";
import { DisplayCurrencyProvider } from "@/contexts/display-currency-context";
import { ProjectionProvider } from "@/contexts/projection-context";
import { NetWorthProvider } from "@/contexts/net-worth-context";
import { MaskingProviderWrapper } from "@/components/masking-provider-wrapper";
import { DemoProvider } from "@/contexts/demo-context";
import { getUserPreferences } from "@/lib/preferences";
import { getInitialExchangeRates } from "@/lib/actions";
import {
  calculateDemoNetWorth,
  getDemoNetWorthBreakdown,
  getDemoPercentageIncrease,
  getDemoFinancialMetrics,
} from "@/lib/demo-data";

export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read user preferences from cookies (SSR-friendly)
  const { displayCurrency, isMasked } = await getUserPreferences();

  // Fetch exchange rates and calculate demo data server-side
  const [initialExchangeRates] = await Promise.all([
    getInitialExchangeRates(),
  ]);

  // Calculate demo data at the server level (no useEffect needed!)
  const demoNetWorth = calculateDemoNetWorth();
  const demoBreakdown = getDemoNetWorthBreakdown();
  const demoPercentageIncrease = getDemoPercentageIncrease();
  const demoMetrics = getDemoFinancialMetrics();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <MaskingProviderWrapper initialMasked={isMasked}>
        <ExchangeRatesProvider initialRates={initialExchangeRates}>
          <DisplayCurrencyProvider initialCurrency={displayCurrency}>
            <ProjectionProvider>
              <NetWorthProvider
                initialNetWorth={demoNetWorth}
                initialNetWorthBreakdown={demoBreakdown}
                initialPercentageIncrease={demoPercentageIncrease}
                initialFinancialMetrics={demoMetrics}
              >
                <DemoProvider initialDemoMode={true}>
                  {children}
                </DemoProvider>
              </NetWorthProvider>
            </ProjectionProvider>
          </DisplayCurrencyProvider>
        </ExchangeRatesProvider>
      </MaskingProviderWrapper>
      <Toaster />
    </ThemeProvider>
  );
}
