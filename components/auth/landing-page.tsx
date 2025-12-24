"use client";

import { GoogleSignInButton } from "./google-signin-button";
import {
  TrendingUp,
  PieChart,
  BarChart3,
  Shield,
  Globe,
  Zap,
} from "lucide-react";

export function LandingPage() {
  const features = [
    {
      icon: TrendingUp,
      title: "Track Net Worth",
      description: "Monitor your total wealth across all accounts in one place",
    },
    {
      icon: PieChart,
      title: "Visual Insights",
      description:
        "Beautiful charts and graphs to understand your financial health",
    },
    {
      icon: BarChart3,
      title: "Multi-Currency",
      description:
        "Support for multiple currencies with real-time exchange rates",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your financial data is encrypted and stored securely",
    },
    {
      icon: Globe,
      title: "Multi-Account",
      description:
        "Connect and track all your bank accounts, investments, and assets",
    },
    {
      icon: Zap,
      title: "Fast & Reliable",
      description: "Lightning-fast performance with real-time updates",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16 sm:mb-20 lg:mb-24">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-6 rounded-full bg-primary/10 text-primary text-3xl sm:text-4xl">
            💰
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Wealth Tracker
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10">
            Take control of your finances. Track your net worth, visualize your
            wealth, and make informed financial decisions.
          </p>
          <div className="max-w-md mx-auto">
            <GoogleSignInButton />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-card border rounded-lg p-6 sm:p-8 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-primary/10 text-primary mb-4">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="bg-card border rounded-xl p-8 sm:p-12 lg:p-16 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8">
            Why Choose Wealth Tracker?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 max-w-4xl mx-auto">
            <div>
              <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
                100%
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                Free to use
              </p>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
                Real-time
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                Live updates
              </p>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
                Secure
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                Bank-level encryption
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 sm:mt-20">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8 sm:mb-10 text-sm sm:text-base">
            Sign in with Google to start tracking your wealth today
          </p>
          <div className="max-w-md mx-auto">
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    </div>
  );
}
