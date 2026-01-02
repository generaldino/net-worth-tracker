import type React from "react";
import "@/app/globals.css";
import { Inter } from "next/font/google";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/auth/landing-page";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { MaskingProviderWrapper } from "@/components/masking-provider-wrapper";
import { ExchangeRatesProvider } from "@/contexts/exchange-rates-context";
import { DisplayCurrencyProvider } from "@/contexts/display-currency-context";
import { ProjectionProvider } from "@/contexts/projection-context";
import { NetWorthProvider } from "@/contexts/net-worth-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Wealth Tracker",
  description: "Track your wealth across multiple accounts",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <LandingPage />
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
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
                  </NetWorthProvider>
                </ProjectionProvider>
              </DisplayCurrencyProvider>
            </ExchangeRatesProvider>
          </MaskingProviderWrapper>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
