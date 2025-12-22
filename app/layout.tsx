import type React from "react";
import "@/app/globals.css";
import { Inter } from "next/font/google";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { MaskingProviderWrapper } from "@/components/masking-provider-wrapper";
import { ExchangeRatesProvider } from "@/contexts/exchange-rates-context";
import { DisplayCurrencyProvider } from "@/contexts/display-currency-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Wealth Tracker",
  description: "Track your wealth across multiple accounts",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
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
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-full max-w-md p-8 space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">💰 Wealth Tracker</h1>
                <p className="text-muted-foreground">
                  Sign in to start tracking your net worth
                </p>
              </div>
              <GoogleSignInButton />
            </div>
          </div>
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
              <Navbar />
              {children}
            </DisplayCurrencyProvider>
          </ExchangeRatesProvider>
        </MaskingProviderWrapper>
        <Toaster />
      </body>
    </html>
  );
}
