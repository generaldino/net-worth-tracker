import type React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ExchangeRatesProvider } from "@/contexts/exchange-rates-context";
import { DisplayCurrencyProvider } from "@/contexts/display-currency-context";
import { ProjectionProvider } from "@/contexts/projection-context";
import { NetWorthProvider } from "@/contexts/net-worth-context";
import { MaskingProviderWrapper } from "@/components/masking-provider-wrapper";
import { DemoProvider } from "@/contexts/demo-context";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <MaskingProviderWrapper>
        <ExchangeRatesProvider>
          <DisplayCurrencyProvider>
            <ProjectionProvider>
              <NetWorthProvider>
                <DemoProvider>
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

