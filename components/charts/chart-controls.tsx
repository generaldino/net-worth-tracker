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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimePeriod } from "@/lib/types";
import { ClickedData, ChartData, ChartType } from "@/components/charts/types";
import { ChartDisplay } from "@/components/charts/chart-display";
import { getChartData } from "@/lib/actions";

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadChartData() {
      setIsLoading(true);
      try {
        const data = await getChartData(
          timePeriod,
          selectedOwner,
          selectedAccounts
        );
        setChartData(data);
        setClickedData(null); // Reset clicked data when time period changes
      } catch (error) {
        console.error("Error loading chart data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (
      timePeriod !== "all" ||
      selectedOwner !== "all" ||
      selectedAccounts.length !== initialData.accounts.length
    ) {
      loadChartData();
    } else {
      setChartData(initialData);
      setClickedData(null);
    }
  }, [timePeriod, selectedOwner, selectedAccounts, initialData]);

  const getChartDescription = () => {
    switch (chartType) {
      case "total":
        return "Track your total net worth growth over time";
      case "by-account":
        return "See how your wealth is distributed across different accounts over time";
      case "by-account-type":
        return "See your net worth by account type over time";
      case "by-category":
        return "See your net worth by category over time";
      case "by-wealth-source":
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
          <div className="flex flex-col sm:flex-row gap-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full sm:w-[200px] justify-between"
                  disabled={isLoading}
                >
                  {selectedAccounts.length === initialData.accounts.length
                    ? "All Accounts"
                    : `${selectedAccounts.length} selected`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full sm:w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search accounts..." />
                  <CommandEmpty>No account found.</CommandEmpty>
                  <CommandGroup>
                    {initialData.accounts.map((account) => (
                      <CommandItem
                        key={account.id}
                        onSelect={() => {
                          setSelectedAccounts((current) =>
                            current.includes(account.id)
                              ? current.filter((id) => id !== account.id)
                              : [...current, account.id]
                          );
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedAccounts.includes(account.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {account.name} ({account.type})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <Select
              value={selectedOwner}
              onValueChange={(value: string) => setSelectedOwner(value)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner} value={owner}>
                    {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={timePeriod}
              onValueChange={(value: TimePeriod) => setTimePeriod(value)}
              disabled={isLoading}
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
            <Select
              value={chartType}
              onValueChange={(value: ChartType) => {
                setChartType(value);
                setClickedData(null);
              }}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Net Worth</SelectItem>
                <SelectItem value="by-account">By Account</SelectItem>
                <SelectItem value="by-account-type">By Account Type</SelectItem>
                <SelectItem value="by-category">By Category</SelectItem>
                <SelectItem value="by-wealth-source">
                  By Wealth Source
                </SelectItem>
              </SelectContent>
            </Select>
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
