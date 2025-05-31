"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useWindowSize } from "@/hooks/use-window-size";
import { getChartData } from "@/lib/actions";
import type { TimePeriod } from "@/lib/data";

type ChartType = "total" | "accounts" | "sources";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
];

interface ClickedData {
  month: string;
  data: any;
  chartType: ChartType;
}

interface Account {
  id: string;
  name: string;
  type: string;
  isISA: boolean;
}

interface SourceData {
  month: string;
  "Savings from Income": number;
  "Interest Earned": number;
  "Capital Gains": number;
}

interface ChartData {
  netWorthData: Array<{ month: string; netWorth: number }>;
  accountData: Array<Record<string, number>>;
  sourceData: Array<SourceData>;
  accounts: Array<Account>;
}

export function ChartSection() {
  const [chartType, setChartType] = useState<ChartType>("total");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [clickedData, setClickedData] = useState<ClickedData | null>(null);
  const [chartData, setChartData] = useState<ChartData>({
    netWorthData: [],
    accountData: [],
    sourceData: [],
    accounts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const { width } = useWindowSize();

  useEffect(() => {
    async function loadChartData() {
      setIsLoading(true);
      const data = await getChartData(timePeriod);
      setChartData(data);
      setIsLoading(false);
    }
    loadChartData();
  }, [timePeriod]);

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
  const handleBarClick = (data: any, month: string) => {
    setClickedData({ month, data, chartType });
  };

  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium">{entry.name}:</span>
              <span>£{entry.value.toLocaleString()}</span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2">
            Click to pin details
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="h-[300px] sm:h-[400px] w-full flex items-center justify-center">
          <div className="text-muted-foreground">Loading chart data...</div>
        </div>
      );
    }

    switch (chartType) {
      case "total":
        const totalBarSize = getBarSize(chartData.netWorthData.length);
        return (
          <ChartContainer
            config={{
              netWorth: {
                label: "Net Worth",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px] sm:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.netWorthData}
                margin={margins}
                barCategoryGap="15%"
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
                  tickFormatter={(value) => `£${(value / 1000).toFixed(0)}K`}
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                />
                <ChartTooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="netWorth"
                  fill="var(--color-netWorth)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={totalBarSize}
                  onClick={(data) => handleBarClick(data, data.month)}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "accounts":
        const accountBarSize = getBarSize(chartData.accountData.length);
        return (
          <ChartContainer
            config={chartData.accounts.reduce(
              (config, account, index) => ({
                ...config,
                [account.name]: {
                  label: account.name,
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
                barCategoryGap="15%"
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
                  tickFormatter={(value) => `£${(value / 1000).toFixed(0)}K`}
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                />
                <ChartTooltip content={<CustomTooltip />} />
                {chartData.accounts.map((account: Account, index: number) => {
                  const value = chartData.accountData[0]?.[account.name] || 0;
                  if (value > 0) {
                    return (
                      <Bar
                        key={account.id}
                        dataKey={account.name}
                        stackId="accounts"
                        fill={COLORS[index % COLORS.length]}
                        maxBarSize={accountBarSize}
                        onClick={(data) => handleBarClick(data, data.month)}
                        style={{ cursor: "pointer" }}
                      />
                    );
                  }
                  return null;
                })}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "sources":
        const sourceKeys = [
          "Savings from Income",
          "Interest Earned",
          "Capital Gains",
        ];
        const sourceBarSize = getBarSize(chartData.sourceData.length);
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
              <BarChart
                data={chartData.sourceData}
                margin={margins}
                barCategoryGap="15%"
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
                  tickFormatter={(value) => `£${(value / 1000).toFixed(1)}K`}
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                />
                <ChartTooltip content={<CustomTooltip />} />
                {sourceKeys.map((source, index) => (
                  <Bar
                    key={source}
                    dataKey={source}
                    stackId="sources"
                    fill={COLORS[index % COLORS.length]}
                    maxBarSize={sourceBarSize}
                    onClick={(data) => handleBarClick(data, data.month)}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );
    }
  };

  const getChartDescription = () => {
    switch (chartType) {
      case "total":
        return "Track your total net worth growth over time";
      case "accounts":
        return "See how your wealth is distributed across different accounts over time";
      case "sources":
        return "Understand where your wealth growth is coming from each month";
    }
  };

  // Render detailed data panel
  const renderDataDetails = (data: ClickedData) => {
    const { month, data: chartData, chartType: type } = data;

    return (
      <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-medium text-lg">{month} Details</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setClickedData(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </Button>
        </div>

        {type === "total" && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Net Worth:</span>
              <span className="font-medium">
                £{chartData.netWorth.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {type === "accounts" && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">
              Account Breakdown:
            </div>
            {chartData.accounts.map((account: Account, index: number) => {
              const value = chartData.accountData[0]?.[account.name] || 0;
              if (value > 0) {
                return (
                  <div
                    key={account.id}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span>{account.name}</span>
                    </div>
                    <span className="font-medium">
                      £{value.toLocaleString()}
                    </span>
                  </div>
                );
              }
              return null;
            })}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-medium">
                <span>Total:</span>
                <span>
                  £
                  {chartData.accounts
                    .reduce(
                      (sum: number, account: Account) =>
                        sum + (chartData.accountData[0]?.[account.name] || 0),
                      0
                    )
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {type === "sources" && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">
              Growth Sources:
            </div>
            {["Savings from Income", "Interest Earned", "Capital Gains"].map(
              (source, index) => {
                const value = chartData[source];
                return (
                  <div
                    key={source}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span>{source}</span>
                    </div>
                    <span
                      className={`font-medium ${
                        value >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {value >= 0 ? "+" : ""}£{value.toLocaleString()}
                    </span>
                  </div>
                );
              }
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-medium">
                <span>Total Growth:</span>
                <span
                  className={`${
                    chartData["Savings from Income"] +
                      chartData["Interest Earned"] +
                      chartData["Capital Gains"] >=
                    0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {chartData["Savings from Income"] +
                    chartData["Interest Earned"] +
                    chartData["Capital Gains"] >=
                  0
                    ? "+"
                    : ""}
                  £
                  {(
                    chartData["Savings from Income"] +
                    chartData["Interest Earned"] +
                    chartData["Capital Gains"]
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl">
              Net Worth Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {getChartDescription()}
            </p>
          </div>
          <Select
            value={timePeriod}
            onValueChange={(value: TimePeriod) => setTimePeriod(value)}
          >
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="YTD">YTD</SelectItem>
              <SelectItem value="1Y">1Y</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-6 sm:justify-center">
          <Button
            variant={chartType === "total" ? "default" : "outline"}
            onClick={() => {
              setChartType("total");
              setClickedData(null);
            }}
            className="w-full sm:w-auto text-sm"
          >
            Total Net Worth
          </Button>
          <Button
            variant={chartType === "accounts" ? "default" : "outline"}
            onClick={() => {
              setChartType("accounts");
              setClickedData(null);
            }}
            className="w-full sm:w-auto text-sm"
          >
            By Account
          </Button>
          <Button
            variant={chartType === "sources" ? "default" : "outline"}
            onClick={() => {
              setChartType("sources");
              setClickedData(null);
            }}
            className="w-full sm:w-auto text-sm"
          >
            By Source
          </Button>
        </div>

        <div className="w-full overflow-x-auto">{renderChart()}</div>

        {/* Show clicked data details */}
        {clickedData && renderDataDetails(clickedData)}

        {/* Show instruction text */}
        {!clickedData && !isLoading && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Hover over bars to see values, click to pin details
          </div>
        )}
      </CardContent>
    </Card>
  );
}
