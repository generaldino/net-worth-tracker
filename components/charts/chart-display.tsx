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
} from "recharts";
import { ChartType, ChartData, ClickedData } from "@/components/charts/types";
import { DataDetailsPanel } from "@/components/charts/data-details-panel";
import { COLORS } from "./constants";

interface ChartDisplayProps {
  chartType: ChartType;
  chartData: ChartData;
  clickedData: ClickedData | null;
  setClickedData: (data: ClickedData | null) => void;
  isLoading: boolean;
}

export function ChartDisplay({
  chartType,
  chartData,
  clickedData,
  setClickedData,
  isLoading,
}: ChartDisplayProps) {
  const { width } = useWindowSize();

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
    data: { month: string } & Record<string, any>,
    month: string
  ) => {
    if (chartType === "accounts") {
      // For accounts view, we need to find the month's data
      const monthData = chartData.accountData.find((d) => d.month === month);
      if (monthData) {
        setClickedData({ month, data: monthData, chartType });
      }
    } else {
      setClickedData({ month, data, chartType });
    }
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
                [`${account.name} (${account.type})`]: {
                  label: `${account.name} (${account.type})`,
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
                {chartData.accounts.map((account, index) => {
                  const uniqueName = `${account.name} (${account.type})`;
                  const hasData = chartData.accountData.some(
                    (monthData) => ((monthData[uniqueName] as number) || 0) > 0
                  );
                  if (hasData) {
                    return (
                      <Bar
                        key={account.id}
                        dataKey={uniqueName}
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
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Hover over bars to see values, click to pin details
        </div>
      )}
    </>
  );
}
