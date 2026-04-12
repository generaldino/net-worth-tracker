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
        <SelectItem value="income-spending">Income & Spending</SelectItem>
        <SelectItem value="net-worth-changes">Net Worth Changes</SelectItem>
        <SelectItem value="allocation">Asset Allocation</SelectItem>
      </SelectContent>
    </Select>
  );
}
