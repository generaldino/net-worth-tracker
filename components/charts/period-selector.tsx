"use client";

import type { TimePeriod } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PeriodSelectorProps {
  value: TimePeriod;
  onChange: (value: TimePeriod) => void;
  isLoading?: boolean;
}

const PERIOD_OPTIONS: Array<{ value: TimePeriod; label: string }> = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "YTD", label: "YTD" },
  { value: "all", label: "MAX" },
];

export function PeriodSelector({
  value,
  onChange,
  isLoading = false,
}: PeriodSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as TimePeriod)}
      disabled={isLoading}
    >
      <SelectTrigger
        size="sm"
        className="w-auto min-w-[64px] px-2"
        aria-label="Time period"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIOD_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
