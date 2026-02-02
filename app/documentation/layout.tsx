import type React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { MaskingProviderWrapper } from "@/components/masking-provider-wrapper";
import { ExchangeRatesProvider } from "@/contexts/exchange-rates-context";
import { DisplayCurrencyProvider } from "@/contexts/display-currency-context";
import { ProjectionProvider } from "@/contexts/projection-context";
import { NetWorthProvider } from "@/contexts/net-worth-context";
import { DemoProvider } from "@/contexts/demo-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getUserPreferences } from "@/lib/preferences";
import {
  calculateNetWorth,
  getNetWorthBreakdown,
  getFirstEntryNetWorth,
  getFinancialMetrics,
  getInitialExchangeRates,
} from "@/lib/actions";

export default async function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  // Read user preferences from cookies (SSR-friendly)
  const { displayCurrency, isMasked, isDemoMode, sidebarOpen } = await getUserPreferences();

  // Fetch all data at the layout level (server-side) in parallel
  const [
    netWorth,
    netWorthBreakdown,
    firstEntryData,
    financialMetrics,
    initialExchangeRates,
  ] = await Promise.all([
    calculateNetWorth(),
    getNetWorthBreakdown(),
    getFirstEntryNetWorth(),
    getFinancialMetrics(),
    getInitialExchangeRates(),
  ]);

  // Calculate percentage increase from first entry
  const percentageIncrease =
    firstEntryData && firstEntryData.netWorth !== 0
      ? ((netWorth - firstEntryData.netWorth) /
          Math.abs(firstEntryData.netWorth)) *
        100
      : null;

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
                initialNetWorth={netWorth}
                initialNetWorthBreakdown={netWorthBreakdown}
                initialPercentageIncrease={percentageIncrease}
                initialFinancialMetrics={financialMetrics}
              >
                <DemoProvider initialDemoMode={isDemoMode}>
                  <SidebarProvider defaultOpen={sidebarOpen}>
                    <AppSidebar
                      name={session.user.name}
                      email={session.user.email}
                      avatarUrl={session.user.image}
                    />
                    <SidebarInset className="overflow-x-hidden">
                      <Navbar />
                      {children}
                    </SidebarInset>
                  </SidebarProvider>
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
