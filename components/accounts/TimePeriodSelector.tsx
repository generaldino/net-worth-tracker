"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ValueTimePeriod, valueTimePeriods } from "@/lib/types";

interface TimePeriodSelectorProps {
  selectedTimePeriod: ValueTimePeriod;
  onTimePeriodChange: (period: ValueTimePeriod) => void;
}

export function TimePeriodSelector({
  selectedTimePeriod,
  onTimePeriodChange,
}: TimePeriodSelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b">
      <div className="text-sm text-muted-foreground">
        Showing value changes over the selected time period
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Time Period:</span>
        <Select
          value={selectedTimePeriod}
          onValueChange={(value: ValueTimePeriod) => onTimePeriodChange(value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {valueTimePeriods.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
