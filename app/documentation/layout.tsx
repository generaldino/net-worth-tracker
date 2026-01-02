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

export default async function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

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
                  <SidebarProvider defaultOpen={false}>
                    <AppSidebar
                      name={session.user.name}
                      email={session.user.email}
                      avatarUrl={session.user.avatarUrl}
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

