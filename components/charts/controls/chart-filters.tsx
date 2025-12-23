"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChartFiltersProps {
  owners: string[];
  selectedOwner: string;
  onOwnerChange: (value: string) => void;
  isLoading?: boolean;
}

export function ChartFilters({
  owners,
  selectedOwner,
  onOwnerChange,
  isLoading = false,
}: ChartFiltersProps) {
  return (
    <Select
      value={selectedOwner}
      onValueChange={onOwnerChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full">
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
  );
}
