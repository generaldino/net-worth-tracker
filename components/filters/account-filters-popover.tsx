"use client";

import * as React from "react";
import { Filter, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { AccountFilterState, FilterFacetKey } from "@/lib/account-filters";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterFacetConfig {
  key: FilterFacetKey;
  label: string;
  options: FilterOption[];
  // Adds a search box above the list. Applied automatically once a facet has
  // more options than fit comfortably.
  searchable?: boolean;
}

interface AccountFiltersPopoverProps {
  facets: FilterFacetConfig[];
  filters: AccountFilterState;
  activeCount: number;
  onToggle: (key: FilterFacetKey, value: string) => void;
  onClearFacet: (key: FilterFacetKey) => void;
  onClearAll: () => void;
  align?: "start" | "end";
  isPending?: boolean;
  className?: string;
}

const SEARCH_THRESHOLD = 8;

function FacetSection({
  facet,
  selected,
  onToggle,
  onClear,
}: {
  facet: FilterFacetConfig;
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const showSearch =
    facet.searchable ?? facet.options.length > SEARCH_THRESHOLD;

  const visibleOptions = React.useMemo(() => {
    if (!query.trim()) return facet.options;
    const q = query.trim().toLowerCase();
    return facet.options.filter((o) => o.label.toLowerCase().includes(q));
  }, [facet.options, query]);

  if (facet.options.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium">{facet.label}</h4>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[11px] text-muted-foreground"
            onClick={onClear}
          >
            Clear
          </Button>
        )}
      </div>

      {showSearch && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${facet.label.toLowerCase()}...`}
            className="h-7 pl-7 text-xs"
            aria-label={`Search ${facet.label}`}
          />
        </div>
      )}

      <div className="space-y-1.5">
        {visibleOptions.length === 0 && (
          <p className="text-xs text-muted-foreground py-1">No matches.</p>
        )}
        {visibleOptions.map((option) => {
          const id = `filter-${facet.key}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={selected.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <label
                htmlFor={id}
                className="text-sm leading-none cursor-pointer truncate"
                title={option.label}
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterBody({
  facets,
  filters,
  activeCount,
  onToggle,
  onClearFacet,
  onClearAll,
}: Pick<
  AccountFiltersPopoverProps,
  | "facets"
  | "filters"
  | "activeCount"
  | "onToggle"
  | "onClearFacet"
  | "onClearAll"
>) {
  const visibleFacets = facets.filter((f) => f.options.length > 0);

  return (
    <div className="flex flex-col">
      <div className="overflow-y-auto max-h-[min(60vh,380px)]">
        <div className="p-3 space-y-3">
          {visibleFacets.map((facet, index) => (
            <div
              key={facet.key}
              className={cn(index > 0 && "border-t pt-3")}
            >
              <FacetSection
                facet={facet}
                selected={filters[facet.key]}
                onToggle={(value) => onToggle(facet.key, value)}
                onClear={() => onClearFacet(facet.key)}
              />
            </div>
          ))}
          {visibleFacets.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing to filter yet.
            </p>
          )}
        </div>
      </div>

      {activeCount > 0 && (
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={onClearAll}
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}

// One filter control, rendered as a popover on desktop and a bottom sheet on
// mobile. Used by the navbar and the accounts toolbar so both look and behave
// the same.
export function AccountFiltersPopover({
  facets,
  filters,
  activeCount,
  onToggle,
  onClearFacet,
  onClearAll,
  align = "start",
  isPending = false,
  className,
}: AccountFiltersPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      className={cn("h-8 gap-1.5 relative bg-transparent", className)}
      aria-label="Filters"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Filter className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">Filters</span>
      {activeCount > 0 && (
        <Badge
          variant="default"
          className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
        >
          {activeCount}
        </Badge>
      )}
    </Button>
  );

  const body = (
    <FilterBody
      facets={facets}
      filters={filters}
      activeCount={activeCount}
      onToggle={onToggle}
      onClearFacet={onClearFacet}
      onClearAll={onClearAll}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="p-0 gap-0 pb-2">
          <SheetHeader className="border-b p-3">
            <SheetTitle className="text-base">Filters</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-[280px] p-0">
        {body}
      </PopoverContent>
    </Popover>
  );
}
