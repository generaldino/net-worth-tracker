"use client";

import { GoogleSignInButton } from "./google-signin-button";
import {
  TrendingUp,
  Shield,
  Sparkles,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock,
  Calculator,
  PieChart,
  LineChart,
  Zap,
  Database,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NetWorthChart } from "./charts/net-worth-chart";
import { AssetsLiabilitiesChart } from "./charts/assets-liabilities-chart";
import { SavingsRateChart } from "./charts/savings-rate-chart";
import { WealthGrowthChart } from "./charts/wealth-growth-chart";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-background to-background" />

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Copy */}
            <div className="max-w-2xl">
              <Badge
                variant="secondary"
                className="mb-6 text-xs font-medium px-3 py-1"
              >
                <Sparkles className="w-3 h-3 mr-1.5 inline" />
                {"Just 10 minutes per month"}
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 text-balance">
                {"Your complete financial picture."}{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {"In one place."}
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed text-pretty">
                {
                  "Track your net worth across all accounts with beautiful visualizations. Just update your balances once a month—we do the rest."
                }
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <GoogleSignInButton />
                <button className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium border border-border rounded-lg hover:bg-accent transition-colors">
                  {"View demo"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{"Free forever"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{"Bank-level security"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{"No connections"}</span>
                </div>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="relative lg:h-[600px] flex items-center justify-center">
              <div className="relative w-full max-w-md">
                {/* Main Dashboard Card */}
                <div className="relative bg-card border border-border rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {"Total Net Worth"}
                      </p>
                      <h3 className="text-3xl font-bold">{"£449,287"}</h3>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>{"+41%"}</span>
                    </div>
                  </div>

                  {/* Mini Chart */}
                  <div className="relative h-32 mb-6 rounded-lg bg-muted/30 overflow-hidden">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 300 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,80 L30,75 L60,70 L90,68 L120,65 L150,58 L180,50 L210,45 L240,40 L270,35 L300,30"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-emerald-600"
                      />
                      <path
                        d="M0,80 L30,75 L60,70 L90,68 L120,65 L150,58 L180,50 L210,45 L240,40 L270,35 L300,30 L300,100 L0,100 Z"
                        fill="url(#gradient)"
                        opacity="0.2"
                      />
                      <defs>
                        <linearGradient
                          id="gradient"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor="rgb(16 185 129)"
                            stopOpacity="0.5"
                          />
                          <stop
                            offset="100%"
                            stopColor="rgb(16 185 129)"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  {/* Account List */}
                  <div className="space-y-3">
                    {[
                      {
                        name: "Stock",
                        value: "£150.6K",
                        color: "bg-amber-500",
                        percent: "33%",
                      },
                      {
                        name: "Savings",
                        value: "£75.8K",
                        color: "bg-emerald-500",
                        percent: "16%",
                      },
                      {
                        name: "Crypto",
                        value: "£60.2K",
                        color: "bg-orange-500",
                        percent: "13%",
                      },
                      {
                        name: "Current",
                        value: "£42.4K",
                        color: "bg-orange-400",
                        percent: "9%",
                      },
                    ].map((account, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${account.color}`}
                          />
                          <span className="text-sm font-medium">
                            {account.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {account.percent}
                          </span>
                          <span className="text-sm font-semibold">
                            {account.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating Stats */}
                <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {"Time to update"}
                      </p>
                      <p className="text-sm font-semibold">{"10 min/month"}</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 bg-card border border-border rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {"Accounts"}
                      </p>
                      <p className="text-sm font-semibold">{"12 connected"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="border-b border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4">
              {"Simple Process"}
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-balance">
              {"How it works"}
            </h2>
            <p className="text-lg text-muted-foreground text-pretty">
              {
                "No bank connections. No data sharing. Just manual entry once a month. We calculate everything for you."
              }
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto mb-16">
            {[
              {
                step: "1",
                icon: Database,
                title: "Add Your Accounts",
                description:
                  "Create accounts for your bank balances, investments, crypto, and loans.",
              },
              {
                step: "2",
                icon: Calculator,
                title: "Enter Monthly Data",
                description:
                  "Just 4 numbers per account: Closing Balance, Cash In, Cash Out, and Income.",
              },
              {
                step: "3",
                icon: Zap,
                title: "We Calculate Everything",
                description:
                  "Automatically compute net worth, savings rate, capital gains, and cash flow.",
              },
              {
                step: "4",
                icon: LineChart,
                title: "Visualize & Analyze",
                description:
                  "Track trends with beautiful charts. See exactly where your wealth is growing.",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="relative">
                  <div className="bg-card border border-border rounded-xl p-6 h-full">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-sm flex items-center justify-center">
                        {item.step}
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border">
                      <ArrowRight className="absolute -right-1 -top-2 w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Data Fields Explanation */}
          <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-center">
              {"What we track"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  field: "Closing Balance",
                  description:
                    "Your account balance at the end of each month. The foundation of net worth tracking.",
                  icon: "💰",
                },
                {
                  field: "Cash In",
                  description:
                    "All money coming into the account: deposits, transfers, salary, investment contributions.",
                  icon: "📥",
                },
                {
                  field: "Cash Out",
                  description:
                    "All money leaving the account: withdrawals, expenses, transfers, and payments.",
                  icon: "📤",
                },
                {
                  field: "Income",
                  description:
                    "The portion of Cash In that represents earned income from salary or business revenue.",
                  icon: "💵",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 text-2xl">{item.icon}</div>
                  <div>
                    <h4 className="font-semibold mb-1">{item.field}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">
                  {"We automatically calculate: "}
                </span>
                {
                  "Cash Flow (net movement), Account Growth (investment gains/interest), Savings Rate, Expenditure, Net Worth changes, and more."
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Visualizations Section */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4">
              {"Powerful Insights"}
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-balance">
              {"Beautiful charts that tell your financial story"}
            </h2>
            <p className="text-lg text-muted-foreground text-pretty">
              {
                "From net worth tracking to savings rate analysis, every chart is designed to give you clarity and confidence."
              }
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Net Worth Chart */}
            <div className="bg-card border border-border rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">
                  {"Net Worth Breakdown"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {
                  "Track all your assets by type with a beautiful stacked area chart. See how your portfolio allocation changes over time."
                }
              </p>
              <div className="relative aspect-[16/10] bg-background rounded-lg overflow-hidden border border-border/50">
                <NetWorthChart />
              </div>
            </div>

            {/* Assets vs Liabilities */}
            <div className="bg-card border border-border rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">
                  {"Assets vs Liabilities"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {
                  "Understand your financial health by comparing what you own against what you owe. Watch your net worth grow."
                }
              </p>
              <div className="relative aspect-[16/10] bg-background rounded-lg overflow-hidden border border-border/50">
                <AssetsLiabilitiesChart />
              </div>
            </div>

            {/* Savings Rate */}
            <div className="bg-card border border-border rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">
                  {"Savings Rate Analysis"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {
                  "Track your income, spending, and savings rate month by month. Identify patterns and optimize your financial habits."
                }
              </p>
              <div className="relative aspect-[16/10] bg-background rounded-lg overflow-hidden border border-border/50">
                <SavingsRateChart />
              </div>
            </div>

            {/* Wealth Growth Sources */}
            <div className="bg-card border border-border rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <LineChart className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">
                  {"Wealth Growth Sources"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {
                  "See exactly where your wealth is coming from: active savings, investment gains, or interest earned. Optimize your strategy."
                }
              </p>
              <div className="relative aspect-[16/10] bg-background rounded-lg overflow-hidden border border-border/50">
                <WealthGrowthChart />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-balance">
            {"Everything you need to track your wealth"}
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            {
              "Powerful features designed to give you complete visibility and control over your finances."
            }
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: TrendingUp,
              title: "Real-time tracking",
              description:
                "Monitor your net worth with live updates across all your accounts and investments.",
            },
            {
              icon: BarChart3,
              title: "9+ chart types",
              description:
                "Visualize your wealth with intuitive charts: waterfall, allocation, projections, and more.",
            },
            {
              icon: Shield,
              title: "Privacy first",
              description:
                "No bank connections. Your data stays with you. We never sell or share your information.",
            },
            {
              icon: Sparkles,
              title: "Multi-currency support",
              description:
                "Track assets in GBP, USD, EUR, or AED with automatic historical exchange rates.",
            },
            {
              icon: CheckCircle2,
              title: "10+ account types",
              description:
                "Track current, savings, stocks, crypto, pensions, loans, credit cards, and more.",
            },
            {
              icon: ArrowRight,
              title: "Export & sharing",
              description:
                "Export to CSV or share your dashboard with financial advisors and partners.",
            },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="group relative bg-card border border-border rounded-xl p-6 hover:border-emerald-500/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4 group-hover:bg-emerald-500/10 transition-colors">
                  <Icon className="w-6 h-6 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-balance">
              {"Start tracking your net worth today"}
            </h2>
            <p className="text-lg text-muted-foreground mb-10 text-pretty">
              {
                "Join thousands of users who have taken control of their financial future. Sign up in seconds—no credit card required."
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <GoogleSignInButton />
            </div>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{"10 min/month"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>{"No bank connections"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>{"Free forever"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
