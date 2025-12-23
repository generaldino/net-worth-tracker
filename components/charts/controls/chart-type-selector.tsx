"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChartType } from "@/components/charts/types";

interface ChartTypeSelectorProps {
  value: ChartType;
  onChange: (value: ChartType) => void;
  isLoading?: boolean;
}

export function ChartTypeSelector({
  value,
  onChange,
  isLoading = false,
}: ChartTypeSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="total">Net Worth</SelectItem>
        <SelectItem value="assets-vs-liabilities">Assets vs Liabilities</SelectItem>
        <SelectItem value="by-wealth-source">By Wealth Source</SelectItem>
        <SelectItem value="savings-rate">Savings Rate</SelectItem>
        <SelectItem value="monthly-growth-rate">Monthly Growth Rate</SelectItem>
        <SelectItem value="allocation">Allocation</SelectItem>
        <SelectItem value="waterfall">Waterfall (Net Worth Changes)</SelectItem>
        <SelectItem value="projection">Projection</SelectItem>
      </SelectContent>
    </Select>
  );
}
