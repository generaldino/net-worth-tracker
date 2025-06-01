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
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="total">Net Worth</SelectItem>
        <SelectItem value="by-account">By Account</SelectItem>
        <SelectItem value="by-account-type">By Account Type</SelectItem>
        <SelectItem value="by-category">By Category</SelectItem>
        <SelectItem value="by-wealth-source">By Wealth Source</SelectItem>
      </SelectContent>
    </Select>
  );
}
