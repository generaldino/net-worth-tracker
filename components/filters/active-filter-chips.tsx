"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FACET_LABEL,
  FILTER_FACET_KEYS,
  type AccountFilterState,
  type FilterFacetKey,
} from "@/lib/account-filters";
import type { FilterFacetConfig } from "./account-filters-popover";

interface ActiveFilterChipsProps {
  facets: FilterFacetConfig[];
  filters: AccountFilterState;
  onToggle: (key: FilterFacetKey, value: string) => void;
  onClearAll: () => void;
  className?: string;
}

// Keeps the current selection visible after the popover closes — a count
// badge alone tells you how many filters are on but not which.
export function ActiveFilterChips({
  facets,
  filters,
  onToggle,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  const labelFor = (key: FilterFacetKey, value: string) =>
    facets
      .find((f) => f.key === key)
      ?.options.find((o) => o.value === value)?.label ?? value;

  const chips = FILTER_FACET_KEYS.flatMap((key) =>
    filters[key].map((value) => ({ key, value }))
  );

  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chips.map(({ key, value }) => (
        <Badge
          key={`${key}-${value}`}
          variant="secondary"
          className="h-6 gap-1 pl-2 pr-1 text-xs font-normal"
        >
          <span className="text-muted-foreground">{FACET_LABEL[key]}:</span>
          <span className="max-w-[140px] truncate">{labelFor(key, value)}</span>
          <button
            type="button"
            onClick={() => onToggle(key, value)}
            className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
            aria-label={`Remove ${FACET_LABEL[key]} filter ${labelFor(
              key,
              value
            )}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground"
        onClick={onClearAll}
      >
        Clear all
      </Button>
    </div>
  );
}
