"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TimePeriod } from "@/lib/types";
import { ClickedData, ChartData, ChartType } from "@/components/charts/types";
import { ChartDisplay } from "@/components/charts/chart-display";
import { getChartData } from "@/lib/actions";
import { AccountSelector } from "./controls/account-selector";
import { ChartTypeSelector } from "./controls/chart-type-selector";
import { ChartFilters } from "./controls/chart-filters";
import { AccountTypeSelector } from "./controls/account-type-selector";
import { CategorySelector } from "./controls/category-selector";
import { accountTypes } from "@/lib/types";

const accountCategories = ["Cash", "Investments"];

interface ChartControlsProps {
  initialData: ChartData;
  owners: string[];
}

export function ChartControls({ initialData, owners }: ChartControlsProps) {
  const [chartType, setChartType] = useState<ChartType>("total");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [clickedData, setClickedData] = useState<ClickedData | null>(null);
  const [chartData, setChartData] = useState<ChartData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    initialData.accounts.map((account) => account.id)
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>(accountTypes);
  const [selectedCategories, setSelectedCategories] =
    useState<string[]>(accountCategories);

  useEffect(() => {
    async function loadChartData() {
      setIsLoading(true);
      try {
        const data = await getChartData(
          timePeriod,
          selectedOwner,
          selectedAccounts,
          selectedTypes,
          selectedCategories
        );
        setChartData(data);
        setClickedData(null);
      } catch (error) {
        console.error("Error loading chart data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (
      timePeriod !== "all" ||
      selectedOwner !== "all" ||
      selectedAccounts.length !== initialData.accounts.length ||
      selectedTypes.length !== accountTypes.length ||
      selectedCategories.length !== accountCategories.length
    ) {
      loadChartData();
    } else {
      setChartData(initialData);
      setClickedData(null);
    }
  }, [
    timePeriod,
    selectedOwner,
    selectedAccounts,
    selectedTypes,
    selectedCategories,
    initialData,
  ]);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <AccountSelector
              accounts={initialData.accounts}
              selectedAccounts={selectedAccounts}
              onAccountsChange={setSelectedAccounts}
              isLoading={isLoading}
            />
            <AccountTypeSelector
              selectedTypes={selectedTypes}
              onTypesChange={setSelectedTypes}
              isLoading={isLoading}
            />
            <CategorySelector
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              isLoading={isLoading}
            />
            <ChartFilters
              owners={owners}
              selectedOwner={selectedOwner}
              onOwnerChange={setSelectedOwner}
              timePeriod={timePeriod}
              onTimePeriodChange={setTimePeriod}
              isLoading={isLoading}
            />
            <ChartTypeSelector
              value={chartType}
              onChange={(value) => {
                setChartType(value);
                setClickedData(null);
              }}
              isLoading={isLoading}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartDisplay
          chartType={chartType}
          chartData={chartData}
          clickedData={clickedData}
          setClickedData={setClickedData}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
