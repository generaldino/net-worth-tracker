"use client";

import type { TimePeriod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PeriodSelectorProps {
  value: TimePeriod;
  onChange: (value: TimePeriod) => void;
  isLoading?: boolean;
}

// Map our existing TimePeriod to button labels
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
    <div className="flex items-center gap-1 sm:gap-2">
      {PERIOD_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(option.value)}
          disabled={isLoading}
          className={cn(
            "h-8 px-3 text-xs sm:text-sm",
            value === option.value && "bg-primary text-primary-foreground"
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

