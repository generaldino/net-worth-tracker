import type React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { MaskingProviderWrapper } from "@/components/masking-provider-wrapper";
import { ExchangeRatesProvider } from "@/contexts/exchange-rates-context";
import { DisplayCurrencyProvider } from "@/contexts/display-currency-context";
import { DemoProvider } from "@/contexts/demo-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getUserPreferences } from "@/lib/preferences";
import { getInitialExchangeRates } from "@/lib/actions";

export default async function SharingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const { displayCurrency, isMasked, isDemoMode, sidebarOpen } =
    await getUserPreferences();
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
          </DisplayCurrencyProvider>
        </ExchangeRatesProvider>
      </MaskingProviderWrapper>
      <Toaster />
    </ThemeProvider>
  );
}
