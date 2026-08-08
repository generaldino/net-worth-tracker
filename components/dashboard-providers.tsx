import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { MaskingProviderWrapper } from "@/components/masking-provider-wrapper";
import { ExchangeRatesProvider } from "@/contexts/exchange-rates-context";
import { DisplayCurrencyProvider } from "@/contexts/display-currency-context";
import { Navbar } from "@/components/navbar";
import { AssistantProvider } from "@/components/assistant/assistant-provider";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { getUserPreferences } from "@/lib/preferences";
import { getInitialExchangeRates, getChartData } from "@/lib/actions";
import { getCheckinStatus } from "@/app/actions/checkin";
import { canUseAssistant } from "@/lib/llm/access";
import { ChartDataProvider } from "@/contexts/chart-data-context";

/**
 * Loads the full chart dataset and provides it via context. Only the home
 * screen needs this — other pages skip the fetch entirely.
 */
export async function ChartDataLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const chartData = await getChartData("all");
  return <ChartDataProvider data={chartData}>{children}</ChartDataProvider>;
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

// Shared provider + chrome tree for every signed-in page: top bar with the
// two tabs, the check-in button, and the avatar menu. Pages fetch their own
// data below this.
export async function DashboardProviders({
  session,
  children,
}: DashboardProvidersProps) {
  const { displayCurrency, isMasked } = await getUserPreferences();

  const [initialExchangeRates, assistantAllowed, checkin] = await Promise.all([
    getInitialExchangeRates(),
    canUseAssistant(),
    getCheckinStatus(),
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
            <AssistantProvider canUseAssistant={assistantAllowed}>
              <div className="min-h-svh bg-background">
                <Navbar
                  name={session.user.name}
                  email={session.user.email}
                  avatarUrl={session.user.image ?? null}
                  checkin={checkin}
                />
                {children}
              </div>
              <AssistantDrawer />
            </AssistantProvider>
          </DisplayCurrencyProvider>
        </ExchangeRatesProvider>
      </MaskingProviderWrapper>
      <Toaster />
    </ThemeProvider>
  );
}
