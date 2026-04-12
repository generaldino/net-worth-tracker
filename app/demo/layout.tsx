import type React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ExchangeRatesProvider } from "@/contexts/exchange-rates-context";
import { DisplayCurrencyProvider } from "@/contexts/display-currency-context";
import { MaskingProviderWrapper } from "@/components/masking-provider-wrapper";
import { DemoProvider } from "@/contexts/demo-context";
import { getUserPreferences } from "@/lib/preferences";
import { getInitialExchangeRates } from "@/lib/actions";

export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { displayCurrency, isMasked } = await getUserPreferences();
  const initialExchangeRates = await getInitialExchangeRates();

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
            <DemoProvider initialDemoMode={true}>{children}</DemoProvider>
          </DisplayCurrencyProvider>
        </ExchangeRatesProvider>
      </MaskingProviderWrapper>
      <Toaster />
    </ThemeProvider>
  );
}
