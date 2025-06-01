"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimePeriod } from "@/lib/types";

interface ChartFiltersProps {
  owners: string[];
  selectedOwner: string;
  onOwnerChange: (value: string) => void;
  timePeriod: TimePeriod;
  onTimePeriodChange: (value: TimePeriod) => void;
  isLoading?: boolean;
}

export function ChartFilters({
  owners,
  selectedOwner,
  onOwnerChange,
  timePeriod,
  onTimePeriodChange,
  isLoading = false,
}: ChartFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select
        value={selectedOwner}
        onValueChange={onOwnerChange}
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
        onValueChange={onTimePeriodChange}
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
    </div>
  );
}
