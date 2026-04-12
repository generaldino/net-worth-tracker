import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { MaskingProviderWrapper } from "@/components/masking-provider-wrapper";
import { ExchangeRatesProvider } from "@/contexts/exchange-rates-context";
import { DisplayCurrencyProvider } from "@/contexts/display-currency-context";
import { NetWorthProvider } from "@/contexts/net-worth-context";
import { DemoProvider } from "@/contexts/demo-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar } from "@/components/navbar";
import { AssistantProvider } from "@/components/assistant/assistant-provider";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { getUserPreferences } from "@/lib/preferences";
import {
  calculateNetWorth,
  getNetWorthBreakdown,
  getFirstEntryNetWorth,
  getFinancialMetrics,
  getInitialExchangeRates,
  getChartData,
} from "@/lib/actions";
import { canUseAssistant } from "@/lib/llm/access";
import { ChartDataProvider } from "@/contexts/chart-data-context";

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

interface DashboardProvidersProps {
  session: Session;
  children: React.ReactNode;
}

// Shared provider + chrome tree used by `/` and `/accounts`. Fetches the
// small amount of data the navbar and masking contexts need. Chart-specific
// data is fetched separately and streamed through Suspense.
export async function DashboardProviders({
  session,
  children,
}: DashboardProvidersProps) {
  const { displayCurrency, isMasked, isDemoMode, sidebarOpen } =
    await getUserPreferences();

  const [
    netWorth,
    netWorthBreakdown,
    firstEntryData,
    financialMetrics,
    initialExchangeRates,
    assistantAllowed,
    chartData,
  ] = await Promise.all([
    calculateNetWorth(),
    getNetWorthBreakdown(),
    getFirstEntryNetWorth(),
    getFinancialMetrics(),
    getInitialExchangeRates(),
    canUseAssistant(),
    getChartData("all"),
  ]);

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
            <NetWorthProvider
              initialNetWorth={netWorth}
              initialNetWorthBreakdown={netWorthBreakdown}
              initialPercentageIncrease={percentageIncrease}
              initialFinancialMetrics={financialMetrics}
            >
              <ChartDataProvider data={chartData}>
                <DemoProvider initialDemoMode={isDemoMode}>
                  <AssistantProvider canUseAssistant={assistantAllowed}>
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
                    <AssistantDrawer />
                  </AssistantProvider>
                </DemoProvider>
              </ChartDataProvider>
            </NetWorthProvider>
          </DisplayCurrencyProvider>
        </ExchangeRatesProvider>
      </MaskingProviderWrapper>
      <Toaster />
    </ThemeProvider>
  );
}
