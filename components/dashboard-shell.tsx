import { Suspense } from "react";
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
import { DashboardContent } from "@/components/dashboard-content";
import { ChartSection } from "@/components/charts/chart-section";
import { NewAccountsSectionWrapper } from "@/components/new-accounts-section-wrapper";
import { ChartSectionSkeleton } from "@/components/skeletons/chart-skeleton";
import { AccountsSkeleton } from "@/components/skeletons/accounts-skeleton";
import { getUserPreferences } from "@/lib/preferences";
import {
  calculateNetWorth,
  getNetWorthBreakdown,
  getFirstEntryNetWorth,
  getFinancialMetrics,
  getInitialExchangeRates,
} from "@/lib/actions";

interface Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    image?: string | null;
    isAdmin?: boolean;
  };
  expires: string;
}

interface DashboardShellProps {
  session: Session;
}

// Async component that loads and provides data
async function DashboardProviders({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  // Read user preferences from cookies (SSR-friendly)
  const { displayCurrency, isMasked, isDemoMode, sidebarOpen } = await getUserPreferences();

  // Fetch all data at the top level (server-side) in parallel
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
                    avatarUrl={session.user.image ?? null}
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
  );
}

// Main dashboard content with parallel streaming sections
function DashboardMain() {
  return (
    <DashboardContent>
      <div className="min-h-[calc(100svh-56px)] bg-background overflow-x-hidden max-w-full">
        <div className="w-full max-w-full py-4 px-4 sm:px-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Charts section - streams independently */}
            <Suspense fallback={<ChartSectionSkeleton />}>
              <ChartSection />
            </Suspense>
            
            {/* Accounts section - streams independently */}
            <Suspense fallback={<AccountsSkeleton />}>
              <NewAccountsSectionWrapper />
            </Suspense>
          </div>
        </div>
      </div>
    </DashboardContent>
  );
}

export async function DashboardShell({ session }: DashboardShellProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DashboardProviders session={session}>
        <DashboardMain />
      </DashboardProviders>
      <Toaster />
    </ThemeProvider>
  );
}
