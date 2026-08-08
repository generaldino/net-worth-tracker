"use client";

import Link from "next/link";
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
                {"One 5-minute check-in a month"}
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 text-balance">
                {"Know your worth."}{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {"Keep your budget."}
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed text-pretty">
                {
                  "Two numbers matter: your net worth and your savings rate. A five-minute monthly check-in keeps both honest — type your balances and income, we work out the rest. No bank connections, ever."
                }
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <GoogleSignInButton compact />
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  {"View demo"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
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
                      <h3 className="text-3xl font-bold">{"£287,450"}</h3>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>{"+24%"}</span>
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
                        name: "Investments",
                        value: "£112.5K",
                        color: "bg-amber-500",
                        percent: "39%",
                      },
                      {
                        name: "Savings",
                        value: "£86.2K",
                        color: "bg-emerald-500",
                        percent: "30%",
                      },
                      {
                        name: "Property",
                        value: "£58.4K",
                        color: "bg-blue-500",
                        percent: "20%",
                      },
                      {
                        name: "Current",
                        value: "£30.3K",
                        color: "bg-purple-500",
                        percent: "11%",
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
                      <p className="text-sm font-semibold">{"5 min/month"}</p>
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
                        {"July check-in"}
                      </p>
                      <p className="text-sm font-semibold">{"Done in 4:52"}</p>
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
                "No bank connections. No data sharing. One short ritual a month, and two screens that stay honest all year."
              }
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto mb-16">
            {[
              {
                step: "1",
                icon: Database,
                title: "Add your accounts",
                description:
                  "Once. Bank accounts, savings, investments, pension, property, cards and loans — one line each.",
              },
              {
                step: "2",
                icon: Calculator,
                title: "Check in monthly",
                description:
                  "One number per account — the month-end balance, prefilled from last month — plus your income. Five minutes.",
              },
              {
                step: "3",
                icon: Zap,
                title: "Categorise spending",
                description:
                  "Import a card statement; merchant rules file most of it automatically. Set a target per category if you want a plan.",
              },
              {
                step: "4",
                icon: LineChart,
                title: "See the story",
                description:
                  "Net worth and why it changed — what you saved vs what markets did — and spending vs your plan.",
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
                  field: "Balances",
                  description:
                    "One number per account at month end. That alone is enough to track net worth.",
                  icon: "💰",
                },
                {
                  field: "Income",
                  description:
                    "A line per source — salary, freelance, rental. Carried forward each month so it's usually one glance.",
                  icon: "💵",
                },
                {
                  field: "Spending",
                  description:
                    "Imported from card statements or added by hand, filed into categories automatically by rules you teach once.",
                  icon: "🧾",
                },
                {
                  field: "Targets",
                  description:
                    "An optional monthly number per category. That's what turns spending history into a budget you review.",
                  icon: "🎯",
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
                  "Net worth, assets vs debts, your mix (cash / invested / property / debt), savings rate, spending vs plan, and how much of each month's change came from saving vs markets."
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
                  {"Net worth, month by month"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {
                  "The headline number, with assets stacked above the line and debts below — one chart that answers \"am I growing?\""
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
                  {"Assets vs debts"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {
                  "What you own against what you owe, kept visibly separate — so paying down debt shows up as the win it is."
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
                  {"Income, spending & savings rate"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {
                  "The budget side: what came in, what went out, and the share you kept — the one number you can act on monthly."
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
                  {"Why it changed"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {
                  "Every month's move split into what you saved and what markets did — so you always know which one to credit."
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
            {"Everything you need — and nothing else"}
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            {
              "Two screens and a monthly ritual. The rest of the app stays out of your way."
            }
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Clock,
              title: "A five-minute ritual",
              description:
                "Balances prefilled from last month, income carried forward — the check-in ends with what your net worth did and why.",
            },
            {
              icon: TrendingUp,
              title: "Net worth, explained",
              description:
                "Not just the number: every month split into what you saved and what markets did, plus your cash / invested / property / debt mix.",
            },
            {
              icon: BarChart3,
              title: "A budget you review",
              description:
                "Targets per category, plan vs actual, fixed and variable kept apart — and an on-track answer any day of the month.",
            },
            {
              icon: Shield,
              title: "Privacy first",
              description:
                "No bank connections, manual by design. Your data stays with you, with one-tap masking for public places.",
            },
            {
              icon: Sparkles,
              title: "Multi-currency",
              description:
                "Track accounts in GBP, USD, EUR, or AED — balances convert at each month's rate.",
            },
            {
              icon: ArrowRight,
              title: "Export & sharing",
              description:
                "Your data is yours: export to CSV anytime, or share a read-only dashboard with a partner or adviser.",
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
              {"You can\u2019t improve what you don\u2019t measure"}
            </h2>
            <p className="text-lg text-muted-foreground mb-10 text-pretty">
              {
                "Add your accounts once, then five minutes a month keeps your net worth and your budget honest. Sign in with Google — free, no card, no bank connections."
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <GoogleSignInButton compact />
            </div>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{"5 min/month"}</span>
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
