"use client";

import { useWindowSize } from "@/hooks/use-window-size";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMasking } from "@/contexts/masking-context";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { COLORS } from "@/components/charts/constants";

interface ProjectionDataPoint {
  month: string;
  monthIndex: number;
  netWorth: number;
  accountBalances: Array<{
    accountId: string;
    accountName: string;
    accountType: string;
    balance: number;
    currency: Currency;
  }>;
}

interface ProjectionChartProps {
  data: ProjectionDataPoint[];
}

export function ProjectionChart({ data }: ProjectionChartProps) {
  const { width } = useWindowSize();
  const { isMasked } = useMasking();
  const { getChartCurrency } = useDisplayCurrency();
  const chartCurrency = getChartCurrency() as Currency;

  // Show empty state if no data
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] sm:h-[400px] text-center">
        <p className="text-muted-foreground mb-2">No projection data available</p>
        <p className="text-sm text-muted-foreground">
          Calculate a projection to view the chart
        </p>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((point) => ({
    month: new Date(point.month + "-01").toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    }),
    monthKey: point.month,
    "Net Worth": point.netWorth,
  }));

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

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
      payload: {
        month: string;
      };
    }>;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{payload[0].payload.month}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}:{" "}
              {isMasked
                ? "•••"
                : formatCurrencyAmount(entry.value, chartCurrency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer
      config={{
        "Net Worth": {
          label: "Net Worth",
          color: "hsl(var(--chart-1))",
        },
      }}
      className="h-[300px] sm:h-[400px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={margins}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            fontSize={fontSize}
            angle={-45}
            textAnchor="end"
            height={margins.bottom + 10}
            interval={Math.floor(chartData.length / 12)} // Show ~12 labels
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
          <ChartTooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="Net Worth"
            stroke={COLORS[0]}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS[0] }}
            activeDot={{ r: 5, fill: COLORS[0] }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

