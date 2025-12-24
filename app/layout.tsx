import type React from "react";
import "@/app/globals.css";
import { Inter } from "next/font/google";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/auth/landing-page";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { MaskingProviderWrapper } from "@/components/masking-provider-wrapper";
import { ExchangeRatesProvider } from "@/contexts/exchange-rates-context";
import { DisplayCurrencyProvider } from "@/contexts/display-currency-context";
import { ProjectionProvider } from "@/contexts/projection-context";
import { NetWorthProvider } from "@/contexts/net-worth-context";

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
      <html lang="en">
        <body className={inter.className}>
          <LandingPage />
          <Toaster />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden`}>
        <MaskingProviderWrapper>
          <ExchangeRatesProvider>
            <DisplayCurrencyProvider>
              <ProjectionProvider>
                <NetWorthProvider>
                  <Navbar />
                  {children}
                </NetWorthProvider>
              </ProjectionProvider>
            </DisplayCurrencyProvider>
          </ExchangeRatesProvider>
        </MaskingProviderWrapper>
        <Toaster />
      </body>
    </html>
  );
}
