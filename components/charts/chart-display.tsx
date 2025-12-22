"use client";

import { useWindowSize } from "@/hooks/use-window-size";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  Legend,
  Tooltip,
} from "recharts";
import { ChartType, ChartData, ClickedData } from "@/components/charts/types";
import { DataDetailsPanel } from "@/components/charts/data-details-panel";
import { COLORS } from "./constants";
import { useMasking } from "@/contexts/masking-context";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";

interface PieTooltipPayload {
  name: string;
  value: number;
  fill: string;
}

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

interface ChartDisplayProps {
  chartType: ChartType;
  chartData: ChartData;
  clickedData: ClickedData | null;
  setClickedData: (data: ClickedData | null) => void;
  isLoading: boolean;
  byAccountOptions?: {
    topN?: number;
  };
  allocationOptions?: {
    viewType?: "account-type" | "category";
    selectedMonth?: string;
  };
}

export function ChartDisplay({
  chartType,
  chartData,
  clickedData,
  setClickedData,
  isLoading,
  byAccountOptions = { topN: undefined },
  allocationOptions = { viewType: "account-type", selectedMonth: undefined },
}: ChartDisplayProps) {
  const { width } = useWindowSize();
  const { isMasked } = useMasking();
  const { getChartCurrency } = useDisplayCurrency();
  const chartCurrency = getChartCurrency() as Currency;

  // Calculate responsive bar size based on data length and screen size
  const getBarSize = (dataLength: number) => {
    if (!width) return 40; // fallback during SSR

    const availableWidth = width - 120; // Account for margins and padding
    const maxBarWidth = availableWidth / dataLength;

    if (width < 640) {
      // mobile
      return Math.max(15, Math.min(50, maxBarWidth * 0.8));
    } else if (width < 1024) {
      // tablet
      return Math.max(25, Math.min(70, maxBarWidth * 0.7));
    } else {
      // desktop
      return Math.max(30, Math.min(80, maxBarWidth * 0.6));
    }
  };

  // Get responsive font size
  const getFontSize = () => {
    if (!width) return 10;
    return width < 640 ? 9 : width < 1024 ? 10 : 11;
  };

  // Get responsive margins
  const getMargins = () => {
    if (!width) return { top: 20, right: 20, left: 20, bottom: 60 };

    if (width < 640) {
      return { top: 15, right: 10, left: 15, bottom: 70 };
    } else if (width < 1024) {
      return { top: 20, right: 15, left: 20, bottom: 65 };
    } else {
      return { top: 20, right: 20, left: 25, bottom: 60 };
    }
  };

  const fontSize = getFontSize();
  const margins = getMargins();

  // Handle bar click
  const handleBarClick = (
    data: { month: string; netWorth?: number; [key: string]: number | string | undefined },
    month: string
  ) => {
    if (chartType === "by-account") {
      // For accounts view, we need to find the month's data
      const monthData = chartData.accountData.find((d) => d.month === month);
      if (monthData) {
        setClickedData({ month, data: monthData, chartType });
      }
    } else if (chartType === "waterfall") {
      // For waterfall, find the processed data
      const reversedSourceData = [...chartData.sourceData].reverse();
      const reversedNetWorthData = [...chartData.netWorthData].reverse();
      const waterfallData = reversedSourceData.map((item, index) => {
        const previousNetWorth =
          index > 0 ? reversedNetWorthData[index - 1].netWorth : reversedNetWorthData[0].netWorth;
        const currentNetWorth = reversedNetWorthData[index]?.netWorth || previousNetWorth;
        return {
          month: item.month,
          monthKey: item.monthKey,
          "Starting Balance": previousNetWorth,
          "Savings from Income": item["Savings from Income"] || 0,
          "Interest Earned": item["Interest Earned"] || 0,
          "Capital Gains": item["Capital Gains"] || 0,
          "Ending Balance": currentNetWorth,
          breakdown: item.breakdown,
        };
      });
      const monthData = waterfallData.find((d) => d.month === month);
      if (monthData) {
        setClickedData({ 
          month, 
          data: monthData, 
          chartType 
        });
      }
    } else if (chartType === "assets-vs-liabilities") {
      // For assets vs liabilities, find the processed data
      const assetsVsLiabilitiesData = chartData.netWorthData.map((item) => {
        if (!item.accountBalances) {
          return {
            month: item.month,
            monthKey: item.monthKey,
            Assets: item.netWorth > 0 ? item.netWorth : 0,
            Liabilities: item.netWorth < 0 ? Math.abs(item.netWorth) : 0,
            "Net Worth": item.netWorth,
          };
        }
        const assets = item.accountBalances
          .filter((acc) => !acc.isLiability)
          .reduce((sum, acc) => sum + acc.balance, 0);
        const liabilities = item.accountBalances
          .filter((acc) => acc.isLiability)
          .reduce((sum, acc) => sum + acc.balance, 0);
        return {
          month: item.month,
          monthKey: item.monthKey,
          Assets: assets,
          Liabilities: liabilities,
          "Net Worth": item.netWorth,
        };
      });
      const monthData = assetsVsLiabilitiesData.find((d) => d.month === month);
      if (monthData) {
        setClickedData({ month, data: monthData, chartType });
      }
    } else {
      setClickedData({ month, data, chartType });
    }
  };

  // Custom tooltip content
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map(
            (
              entry: { name: string; value: number; color: string },
              index: number
            ) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-medium">{entry.name}:</span>
                <span>
                  {entry.name === "Savings Rate"
                    ? isMasked
                      ? "•••"
                      : `${Number(entry.value.toFixed(1))}%`
                    : isMasked
                    ? "••••••"
                    : formatCurrencyAmount(entry.value, chartCurrency)}
                </span>
              </div>
            )
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Click to pin details
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="h-[300px] sm:h-[400px] w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart data...</div>
      </div>
    );
  }

  const renderChart = () => {
    switch (chartType) {
      case "total":
        // Calculate trendline using linear regression
        const calculateTrendline = (data: Array<{ netWorth: number }>) => {
          const n = data.length;
          if (n < 2) return data.map(() => 0);
          
          const x = data.map((_, i) => i);
          const y = data.map((d) => d.netWorth);
          
          const sumX = x.reduce((a, b) => a + b, 0);
          const sumY = y.reduce((a, b) => a + b, 0);
          const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
          const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
          
          const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
          const intercept = (sumY - slope * sumX) / n;
          
          return x.map((xi) => slope * xi + intercept);
        };

        const trendlineValues = calculateTrendline(chartData.netWorthData);
        const netWorthWithTrend = chartData.netWorthData.map((item, index) => ({
          ...item,
          trendline: trendlineValues[index],
          // Calculate percentage change from previous month
          growthRate:
            index > 0
              ? chartData.netWorthData[index - 1].netWorth !== 0
                ? ((item.netWorth - chartData.netWorthData[index - 1].netWorth) /
                    Math.abs(chartData.netWorthData[index - 1].netWorth)) *
                  100
                : 0
              : 0,
        }));

        return (
          <ChartContainer
            config={{
              netWorth: {
                label: "Net Worth",
                color: "hsl(var(--chart-1))",
              },
              trendline: {
                label: "Trend",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[300px] sm:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthWithTrend} margin={margins}>
                <defs>
                  <linearGradient
                    id="netWorthGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  fontSize={fontSize}
                  angle={-45}
                  textAnchor="end"
                  height={margins.bottom + 10}
                  interval={0}
                  tick={{ fontSize }}
                />
                <YAxis
                  tickFormatter={(value) =>
                    isMasked
                      ? "•••"
                      : formatCurrencyAmount(value / 1000, chartCurrency, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }) + "K"
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={["auto", "auto"]}
                  allowDataOverflow={true}
                />
                <ReferenceLine y={0} stroke="#666" />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const netWorthEntry = payload.find(
                        (p) => (p.dataKey as string) === "netWorth"
                      );
                      const trendEntry = payload.find(
                        (p) => (p.dataKey as string) === "trendline"
                      );
                      const dataPoint = netWorthWithTrend.find(
                        (d) => d.month === label
                      );
                      
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium mb-2">{label}</p>
                          {netWorthEntry && (
                            <div className="flex items-center gap-2 text-sm mb-1">
                              <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                  backgroundColor: netWorthEntry.color as string,
                                }}
                              />
                              <span className="font-medium">Net Worth:</span>
                              <span>
                                {isMasked
                                  ? "••••••"
                                  : formatCurrencyAmount(
                                      netWorthEntry.value as number,
                                      chartCurrency
                                    )}
                              </span>
                            </div>
                          )}
                          {dataPoint && dataPoint.growthRate !== 0 && (
                            <div className="text-xs mt-2">
                              <span
                                className={
                                  dataPoint.growthRate >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {dataPoint.growthRate >= 0 ? "+" : ""}
                                {dataPoint.growthRate.toFixed(2)}% vs previous
                              </span>
                            </div>
                          )}
                          {trendEntry && (
                            <div className="flex items-center gap-2 text-xs mt-1 text-muted-foreground">
                              <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                  backgroundColor: trendEntry.color as string,
                                }}
                              />
                              <span>Trend</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Click to pin details
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#netWorthGradient)"
                  strokeWidth={2}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        netWorth: number;
                      };
                      handleBarClick(
                        { month: payload.month, netWorth: payload.netWorth },
                        payload.month
                      );
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
                <Line
                  type="monotone"
                  dataKey="trendline"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "assets-vs-liabilities":
        // Process data to separate assets and liabilities
        const assetsVsLiabilitiesData = chartData.netWorthData.map((item) => {
          if (!item.accountBalances) {
            return {
              month: item.month,
              monthKey: item.monthKey,
              Assets: item.netWorth > 0 ? item.netWorth : 0,
              Liabilities: item.netWorth < 0 ? Math.abs(item.netWorth) : 0,
              "Net Worth": item.netWorth,
            };
          }

          const assets = item.accountBalances
            .filter((acc) => !acc.isLiability)
            .reduce((sum, acc) => sum + acc.balance, 0);

          const liabilities = item.accountBalances
            .filter((acc) => acc.isLiability)
            .reduce((sum, acc) => sum + acc.balance, 0);

          // Net Worth = Assets - Liabilities
          const netWorth = assets - liabilities;

          return {
            month: item.month,
            monthKey: item.monthKey,
            Assets: assets,
            Liabilities: liabilities,
            "Net Worth": netWorth,
          };
        });

        return (
          <ChartContainer
            config={{
              Assets: {
                label: "Assets",
                color: "hsl(var(--chart-2))",
              },
              Liabilities: {
                label: "Liabilities",
                color: "hsl(var(--chart-3))",
              },
              "Net Worth": {
                label: "Net Worth",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px] sm:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={assetsVsLiabilitiesData} margin={margins}>
                <defs>
                  <linearGradient
                    id="assetsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="liabilitiesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="netWorthLineGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  fontSize={fontSize}
                  angle={-45}
                  textAnchor="end"
                  height={margins.bottom + 10}
                  interval={0}
                  tick={{ fontSize }}
                />
                <YAxis
                  tickFormatter={(value) =>
                    isMasked
                      ? "•••"
                      : formatCurrencyAmount(value / 1000, chartCurrency, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }) + "K"
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={["auto", "auto"]}
                  allowDataOverflow={true}
                />
                <ReferenceLine y={0} stroke="#666" />
                <ChartTooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Assets"
                  stackId="1"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#assetsGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Liabilities"
                  stackId="1"
                  stroke="hsl(var(--chart-3))"
                  fill="url(#liabilitiesGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Net Worth"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#netWorthLineGradient)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        Assets: number;
                        Liabilities: number;
                        "Net Worth": number;
                      };
                      handleBarClick(
                        {
                          month: payload.month,
                          Assets: payload.Assets,
                          Liabilities: payload.Liabilities,
                          "Net Worth": payload["Net Worth"],
                        },
                        payload.month
                      );
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "monthly-growth-rate":
        // Calculate month-over-month growth rate
        const growthRateData = chartData.netWorthData.map((item, index) => {
          if (index === 0) {
            return {
              month: item.month,
              monthKey: item.monthKey,
              "Growth Rate": 0,
              netWorth: item.netWorth,
            };
          }
          const previousItem = chartData.netWorthData[index - 1];
          const previousNetWorth = previousItem.netWorth;
          const currentNetWorth = item.netWorth;
          const growthRate =
            previousNetWorth !== 0
              ? ((currentNetWorth - previousNetWorth) / Math.abs(previousNetWorth)) * 100
              : 0;

          return {
            month: item.month,
            monthKey: item.monthKey,
            "Growth Rate": Number(growthRate.toFixed(2)),
            netWorth: currentNetWorth,
          };
        });

        return (
          <ChartContainer
            config={{
              "Growth Rate": {
                label: "Growth Rate (%)",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px] sm:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthRateData} margin={margins}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  fontSize={fontSize}
                  angle={-45}
                  textAnchor="end"
                  height={margins.bottom + 10}
                  interval={0}
                  tick={{ fontSize }}
                />
                <YAxis
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={["auto", "auto"]}
                  allowDataOverflow={true}
                />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium mb-2">{label}</p>
                          {payload.map((entry, index) => {
                            const value = entry.value as number;
                            const name = entry.name as string;
                            const color = entry.color as string;
                            return (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <div
                                  className="w-3 h-3 rounded-sm"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="font-medium">{name}:</span>
                                <span
                                  className={
                                    value >= 0 ? "text-green-600" : "text-red-600"
                                  }
                                >
                                  {isMasked
                                    ? "•••"
                                    : `${value >= 0 ? "+" : ""}${Number(value.toFixed(2))}%`}
                                </span>
                              </div>
                            );
                          })}
                          <p className="text-xs text-muted-foreground mt-2">
                            Click to pin details
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Growth Rate"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--chart-1))" }}
                  activeDot={{ r: 6 }}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        "Growth Rate": number;
                        netWorth: number;
                      };
                      handleBarClick(
                        {
                          month: payload.month,
                          "Growth Rate": payload["Growth Rate"],
                          netWorth: payload.netWorth,
                        },
                        payload.month
                      );
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "by-account":
        // Get latest month's data for sorting
        const latestAccountData = chartData.accountData[chartData.accountData.length - 1] || chartData.accountData[0];
        
        // Always sort by current value (largest to smallest)
        let accountsToDisplay = chartData.accounts
          .map((account) => {
            const uniqueName = `${account.name} (${account.type}${
              account.isISA ? " ISA" : ""
            })`;
            const currentValue = latestAccountData
              ? (latestAccountData[uniqueName] as number | undefined) || 0
              : 0;
            return { account, currentValue: Math.abs(currentValue) };
          })
          .sort((a, b) => b.currentValue - a.currentValue)
          .map((item) => item.account);
        
        // Apply top N filter if specified
        if (byAccountOptions?.topN && byAccountOptions.topN > 0) {
          accountsToDisplay = accountsToDisplay.slice(0, byAccountOptions.topN);
        }
        
        const accountBarSize = getBarSize(chartData.accountData.length);
        // Always stack bars
        const stackId = "by-account-stack";
        
        return (
          <ChartContainer
            config={accountsToDisplay.reduce(
              (config, account, index) => ({
                ...config,
                [`${account.name} (${account.type}${
                  account.isISA ? " ISA" : ""
                })`]: {
                  label: `${account.name} (${account.type}${
                    account.isISA ? " ISA" : ""
                  })`,
                  color: COLORS[index % COLORS.length],
                },
              }),
              {}
            )}
            className="h-[300px] sm:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.accountData}
                margin={margins}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  fontSize={fontSize}
                  angle={-45}
                  textAnchor="end"
                  height={margins.bottom + 10}
                  interval={0}
                  tick={{ fontSize }}
                />
                <YAxis
                  tickFormatter={(value) =>
                    isMasked
                      ? "•••"
                      : formatCurrencyAmount(value / 1000, chartCurrency, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }) + "K"
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                />
                <ReferenceLine y={0} stroke="#666" />
                <ChartTooltip content={<CustomTooltip />} />
                {accountsToDisplay.map((account, index) => {
                  const uniqueName = `${account.name} (${account.type}${
                    account.isISA ? " ISA" : ""
                  })`;
                  const hasData = chartData.accountData.some((monthData) => {
                    const value = monthData[uniqueName] as number | undefined;
                    return value !== undefined && value !== null && value !== 0;
                  });
                  if (hasData) {
                    return (
                      <Bar
                        key={account.id}
                        dataKey={uniqueName}
                        fill={COLORS[index % COLORS.length]}
                        maxBarSize={accountBarSize}
                        stackId={stackId}
                        onClick={(data) => handleBarClick(data, data.month)}
                        style={{ cursor: "pointer" }}
                        isAnimationActive={true}
                      />
                    );
                  }
                  return null;
                })}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "by-wealth-source":
        const sourceKeys = [
          "Savings from Income",
          "Interest Earned",
          "Capital Gains",
        ] as const;
        return (
          <ChartContainer
            config={sourceKeys.reduce(
              (config, source, index) => ({
                ...config,
                [source]: {
                  label: source,
                  color: COLORS[index % COLORS.length],
                },
              }),
              {}
            )}
            className="h-[300px] sm:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.sourceData} margin={margins}>
                <defs>
                  {sourceKeys.map((source, index) => (
                    <linearGradient
                      key={source}
                      id={`${source.replace(/\s+/g, "")}Gradient`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={COLORS[index % COLORS.length]}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS[index % COLORS.length]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  fontSize={fontSize}
                  angle={-45}
                  textAnchor="end"
                  height={margins.bottom + 10}
                  interval={0}
                  tick={{ fontSize }}
                />
                <YAxis
                  tickFormatter={(value) =>
                    isMasked
                      ? "•••"
                      : formatCurrencyAmount(value / 1000, chartCurrency, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        }) + "K"
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={["auto", "auto"]}
                  allowDataOverflow={true}
                />
                <ReferenceLine y={0} stroke="#666" />
                <ChartTooltip content={<CustomTooltip />} />
                {sourceKeys.map((source, index) => {
                  const hasData = chartData.sourceData.some(
                    (monthData) => (monthData[source] || 0) !== 0
                  );
                  if (hasData) {
                    return (
                      <Area
                        key={source}
                        type="monotone"
                        dataKey={source}
                        stackId="1"
                        stroke={COLORS[index % COLORS.length]}
                        fill={`url(#${source.replace(/\s+/g, "")}Gradient)`}
                        strokeWidth={2}
                        onClick={(data) => {
                          if ("payload" in data) {
                            const payload = data.payload as {
                              month: string;
                              [key: string]: string | number | undefined;
                            };
                            if (payload.month) {
                              handleBarClick(payload, payload.month);
                            }
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    );
                  }
                  return null;
                })}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "savings-rate":
        // Calculate average savings rate for reference line
        const savingsRates = chartData.sourceData
          .map((d) => d["Savings Rate"])
          .filter((rate) => typeof rate === "number" && !isNaN(rate));
        const avgSavingsRate =
          savingsRates.length > 0
            ? savingsRates.reduce((sum, rate) => sum + rate, 0) /
              savingsRates.length
            : 0;

        return (
          <ChartContainer
            config={{
              "Savings Rate": {
                label: "Savings Rate",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px] sm:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.sourceData} margin={margins}>
                <defs>
                  <linearGradient
                    id="savingsRateGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  fontSize={fontSize}
                  angle={-45}
                  textAnchor="end"
                  height={margins.bottom + 10}
                  interval={0}
                  tick={{ fontSize }}
                />
                <YAxis
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={["auto", "auto"]}
                  allowDataOverflow={true}
                />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                <ReferenceLine
                  y={20}
                  stroke="hsl(var(--chart-2))"
                  strokeDasharray="3 3"
                  label={{ value: "20% Target", position: "right" }}
                />
                <ReferenceLine
                  y={avgSavingsRate}
                  stroke="hsl(var(--chart-3))"
                  strokeDasharray="2 2"
                  label={{
                    value: `Avg: ${avgSavingsRate.toFixed(1)}%`,
                    position: "right",
                  }}
                />
                <ChartTooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Savings Rate"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#savingsRateGradient)"
                  strokeWidth={2}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        "Savings Rate": number;
                      };
                      handleBarClick(
                        { month: payload.month, "Savings Rate": payload["Savings Rate"] },
                        payload.month
                      );
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "allocation":
        // Determine which data source to use based on view type
        const sourceDataArray = allocationOptions.viewType === "category" 
          ? chartData.categoryData 
          : chartData.accountTypeData;
        
        // Get selected month's data or most recent (first item since data is sorted desc)
        const selectedMonthData = allocationOptions.selectedMonth
          ? sourceDataArray.find((item) => item.month === allocationOptions.selectedMonth || item.monthKey === allocationOptions.selectedMonth)
          : (sourceDataArray.length > 0 ? sourceDataArray[0] : null);

        if (!selectedMonthData) {
          return (
            <div className="h-[300px] sm:h-[400px] w-full flex items-center justify-center">
              <div className="text-muted-foreground">No data available</div>
            </div>
          );
        }

        // Extract values (exclude month and monthKey)
        const allocationData = Object.entries(selectedMonthData)
          .filter(
            ([key]) =>
              key !== "month" &&
              key !== "monthKey" &&
              typeof selectedMonthData[key] === "number" &&
              Math.abs(selectedMonthData[key] as number) > 0
          )
          .map(([name, value], index) => ({
            name,
            value: Math.abs(value as number),
            fill: COLORS[index % COLORS.length],
          }))
          .sort((a, b) => b.value - a.value); // Sort by value descending

        const totalAllocation = allocationData.reduce(
          (sum, item) => sum + item.value,
          0
        );

        const CustomPieTooltip = ({
          active,
          payload,
        }: {
          active?: boolean;
          payload?: Array<{
            name: string;
            value: number;
            payload?: PieTooltipPayload;
          }>;
        }) => {
          if (active && payload && payload.length) {
            const data = payload[0];
            const fill = data.payload?.fill || COLORS[0];
            const percentage = totalAllocation > 0
              ? ((data.value / totalAllocation) * 100).toFixed(1)
              : "0";
            return (
              <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                <p className="font-medium mb-2">{data.name}</p>
                <div className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: fill }}
                  />
                  <span>
                    {isMasked
                      ? "••••••"
                      : formatCurrencyAmount(data.value, chartCurrency)}
                  </span>
                  <span className="text-muted-foreground">
                    ({percentage}%)
                  </span>
                </div>
              </div>
            );
          }
          return null;
        };

        const RADIAN = Math.PI / 180;
        const renderCustomizedLabel = ({
          cx,
          cy,
          midAngle,
          innerRadius,
          outerRadius,
          percent,
        }: PieLabelProps) => {
          if (percent < 0.05) return null; // Don't show label if slice is too small
          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);

          return (
            <text
              x={x}
              y={y}
              fill="white"
              textAnchor={x > cx ? "start" : "end"}
              dominantBaseline="central"
              fontSize={12}
              fontWeight="bold"
            >
              {`${(percent * 100).toFixed(0)}%`}
            </text>
          );
        };

        return (
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              {allocationOptions.viewType === "category" ? "Category" : "Account Type"} Allocation as of {selectedMonthData.month}
            </div>
            <ChartContainer
              config={allocationData.reduce(
                (config, item) => ({
                  ...config,
                  [item.name]: {
                    label: item.name,
                    color: item.fill,
                  },
                }),
                {} as Record<string, { label: string; color: string }>
              )}
              className="h-[300px] sm:h-[400px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={width && width < 640 ? 80 : 100}
                    innerRadius={width && width < 640 ? 40 : 50}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={(data) => {
                      handleBarClick(
                        {
                          month: selectedMonthData.month,
                          [data.name]: data.value,
                        },
                        selectedMonthData.month
                      );
                    }}
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) => {
                      const entryValue = (entry.payload as { value?: number })?.value;
                      const percentage = totalAllocation > 0 && entryValue
                        ? ((entryValue / totalAllocation) * 100).toFixed(1)
                        : "0";
                      return `${value} (${percentage}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="text-center text-xs text-muted-foreground">
              Total:{" "}
              {isMasked
                ? "••••••"
                : formatCurrencyAmount(totalAllocation, chartCurrency)}
            </div>
          </div>
        );

      case "waterfall":
        // Process data for waterfall chart showing month-to-month net worth changes
        // For each month, show: Starting Balance (from previous month) -> +Savings -> +Interest -> +Capital Gains
        // Reverse the arrays to work with chronological order (oldest first)
        const reversedSourceData = [...chartData.sourceData].reverse();
        const reversedNetWorthData = [...chartData.netWorthData].reverse();

        const waterfallData = reversedSourceData.map((item, index) => {
          // Get previous month's net worth (starting balance)
          const previousNetWorth =
            index > 0 ? reversedNetWorthData[index - 1].netWorth : reversedNetWorthData[0].netWorth;
          
          // Get current month's net worth (ending balance)
          const currentNetWorth = reversedNetWorthData[index]?.netWorth || previousNetWorth;

          const savingsFromIncome = item["Savings from Income"] || 0;
          const interestEarned = item["Interest Earned"] || 0;
          const capitalGains = item["Capital Gains"] || 0;

          return {
            month: item.month,
            monthKey: item.monthKey,
            "Starting Balance": previousNetWorth,
            "Savings from Income": savingsFromIncome,
            "Interest Earned": interestEarned,
            "Capital Gains": capitalGains,
            "Ending Balance": currentNetWorth,
            // Store breakdown for details panel
            breakdown: item.breakdown,
          };
        });

        return (
          <ChartContainer
            config={{
              "Starting Balance": {
                label: "Starting Balance",
                color: "hsl(var(--chart-4))",
              },
              "Savings from Income": {
                label: "Savings from Income",
                color: COLORS[0],
              },
              "Interest Earned": {
                label: "Interest Earned",
                color: COLORS[1],
              },
              "Capital Gains": {
                label: "Capital Gains",
                color: COLORS[2],
              },
              "Ending Balance": {
                label: "Ending Balance",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px] sm:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={margins}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  fontSize={fontSize}
                  angle={-45}
                  textAnchor="end"
                  height={margins.bottom + 10}
                  interval={0}
                  tick={{ fontSize }}
                />
                <YAxis
                  tickFormatter={(value) =>
                    isMasked
                      ? "•••"
                      : formatCurrencyAmount(value / 1000, chartCurrency, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }) + "K"
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={["auto", "auto"]}
                  allowDataOverflow={true}
                />
                <ReferenceLine y={0} stroke="#666" />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium mb-2">{label}</p>
                          {payload
                            .filter((entry) => {
                              const key = entry.dataKey as string;
                              return (
                                key === "Starting Balance" ||
                                key === "Savings from Income" ||
                                key === "Interest Earned" ||
                                key === "Capital Gains" ||
                                key === "Ending Balance"
                              );
                            })
                            .map((entry, idx) => {
                              const value = entry.value as number;
                              const name = entry.name as string;
                              const color = entry.color as string;
                              const key = entry.dataKey as string;

                              // Only show non-zero values (except starting and ending)
                              if (
                                (key === "Savings from Income" ||
                                  key === "Interest Earned" ||
                                  key === "Capital Gains") &&
                                value === 0
                              ) {
                                return null;
                              }

                              return (
                                <div key={idx} className="flex items-center gap-2 text-sm mb-1">
                                  <div
                                    className="w-3 h-3 rounded-sm"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="font-medium">{name}:</span>
                                  <span
                                    className={
                                      key === "Capital Gains" && value < 0
                                        ? "text-red-600"
                                        : key === "Starting Balance" || key === "Ending Balance"
                                        ? ""
                                        : "text-green-600"
                                    }
                                  >
                                    {isMasked
                                      ? "••••••"
                                      : key === "Starting Balance" || key === "Ending Balance"
                                      ? formatCurrencyAmount(value, chartCurrency)
                                      : `${value >= 0 ? "+" : ""}${formatCurrencyAmount(value, chartCurrency)}`}
                                  </span>
                                </div>
                              );
                            })}
                          <p className="text-xs text-muted-foreground mt-2">
                            Click to pin details
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Starting Balance - transparent bar for positioning */}
                <Bar
                  dataKey="Starting Balance"
                  fill="transparent"
                  stackId="waterfall"
                />
                {/* Savings from Income */}
                <Bar
                  dataKey="Savings from Income"
                  fill={COLORS[0]}
                  stackId="waterfall"
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        [key: string]: string | number | undefined;
                      };
                      if (payload.month) {
                        handleBarClick(payload, payload.month);
                      }
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
                {/* Interest Earned */}
                <Bar
                  dataKey="Interest Earned"
                  fill={COLORS[1]}
                  stackId="waterfall"
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        [key: string]: string | number | undefined;
                      };
                      if (payload.month) {
                        handleBarClick(payload, payload.month);
                      }
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
                {/* Capital Gains - can be negative */}
                <Bar
                  dataKey="Capital Gains"
                  fill={COLORS[2]}
                  stackId="waterfall"
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        [key: string]: string | number | undefined;
                      };
                      if (payload.month) {
                        handleBarClick(payload, payload.month);
                      }
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );
    }
  };

  return (
    <>
      <div className="w-full overflow-x-auto">{renderChart()}</div>

      {/* Show clicked data details */}
      {clickedData && (
        <DataDetailsPanel
          clickedData={clickedData}
          onClose={() => setClickedData(null)}
        />
      )}

      {/* Show instruction text */}
      {!clickedData && !isLoading && (
        <div className="mt-4 text-center text-xs sm:text-sm text-muted-foreground px-2">
          Hover over bars to see values, click to pin details
        </div>
      )}
    </>
  );
}
