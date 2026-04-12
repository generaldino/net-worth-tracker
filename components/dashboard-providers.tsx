import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { MaskingProviderWrapper } from "@/components/masking-provider-wrapper";
import { ExchangeRatesProvider } from "@/contexts/exchange-rates-context";
import { DisplayCurrencyProvider } from "@/contexts/display-currency-context";
import { DemoProvider } from "@/contexts/demo-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar } from "@/components/navbar";
import { AssistantProvider } from "@/components/assistant/assistant-provider";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { getUserPreferences } from "@/lib/preferences";
import { getInitialExchangeRates, getChartData } from "@/lib/actions";
import { canUseAssistant } from "@/lib/llm/access";
import { ChartDataProvider } from "@/contexts/chart-data-context";

async function ChartDataLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const chartData = await getChartData("all");
  return <ChartDataProvider data={chartData}>{children}</ChartDataProvider>;
}

function DashboardChromeSkeleton() {
  return (
    <>
      <div className="sticky top-0 z-40 w-full border-b bg-background/80 h-[56px]" />
      <div className="py-4 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[240px] sm:h-[280px] rounded-lg bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    </>
  );
}

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

  const [initialExchangeRates, assistantAllowed] = await Promise.all([
    getInitialExchangeRates(),
    canUseAssistant(),
  ]);

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
            <DemoProvider initialDemoMode={isDemoMode}>
              <AssistantProvider canUseAssistant={assistantAllowed}>
                <SidebarProvider defaultOpen={sidebarOpen}>
                  <AppSidebar
                    name={session.user.name}
                    email={session.user.email}
                    avatarUrl={session.user.image ?? null}
                  />
                  <SidebarInset className="overflow-x-hidden">
                    <Suspense fallback={<DashboardChromeSkeleton />}>
                      <ChartDataLoader>
                        <Navbar />
                        {children}
                      </ChartDataLoader>
                    </Suspense>
                  </SidebarInset>
                </SidebarProvider>
                <AssistantDrawer />
              </AssistantProvider>
            </DemoProvider>
          </DisplayCurrencyProvider>
        </ExchangeRatesProvider>
      </MaskingProviderWrapper>
      <Toaster />
    </ThemeProvider>
  );
}
