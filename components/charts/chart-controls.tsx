"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimePeriod } from "@/lib/types";
import { ClickedData, ChartData } from "@/components/charts/types";
import { ChartDisplay } from "@/components/charts/chart-display";

type ChartType = "total" | "accounts" | "sources";

interface ChartControlsProps {
  initialData: ChartData;
}

export function ChartControls({ initialData }: ChartControlsProps) {
  const [chartType, setChartType] = useState<ChartType>("total");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [clickedData, setClickedData] = useState<ClickedData | null>(null);
  const [chartData, setChartData] = useState<ChartData>(initialData);

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

        <ChartDisplay
          chartType={chartType}
          chartData={chartData}
          clickedData={clickedData}
          setClickedData={setClickedData}
        />
      </CardContent>
    </Card>
  );
}
