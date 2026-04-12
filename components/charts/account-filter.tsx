"use client";

import * as React from "react";
import { Check, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useUrlState } from "@/hooks/use-url-state";
import {
  useInitialChartData,
  useChartDataOverride,
} from "@/contexts/chart-data-context";
import { getChartData } from "@/lib/actions";
import { formatAccountTypeName } from "./chart-shared";

type AccountGroup = { type: string; accounts: { id: string; name: string }[] };

function groupAccounts(
  accounts: { id: string; name: string; type: string }[]
): AccountGroup[] {
  const byType = new Map<string, { id: string; name: string }[]>();
  for (const a of accounts) {
    if (!byType.has(a.type)) byType.set(a.type, []);
    byType.get(a.type)!.push({ id: a.id, name: a.name });
  }
  return Array.from(byType.entries())
    .map(([type, list]) => ({
      type,
      accounts: list.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

export function AccountFilter() {
  const initialData = useInitialChartData();
  const override = useChartDataOverride();
  const [open, setOpen] = React.useState(false);
  const [excludedRaw, setExcludedRaw] = useUrlState<string>(
    "excludeAccounts",
    ""
  );
  const [isPending, startTransition] = React.useTransition();

  const excluded = React.useMemo(
    () => (excludedRaw ? excludedRaw.split(",").filter(Boolean) : []),
    [excludedRaw]
  );

  // Recompute chart data whenever the excluded list changes. Skips when
  // nothing is excluded by restoring the initial dataset.
  React.useEffect(() => {
    if (!initialData) return;
    if (excluded.length === 0) {
      override(null);
      return;
    }
    const allIds = initialData.accounts.map((a) => a.id);
    const validExcluded = excluded.filter((id) => allIds.includes(id));
    if (validExcluded.length === 0) {
      override(null);
      return;
    }
    const includeIds = allIds.filter((id) => !validExcluded.includes(id));
    startTransition(async () => {
      try {
        const next = await getChartData("all", "all", includeIds);
        override(next);
      } catch (err) {
        console.error("Failed to refetch filtered chart data", err);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludedRaw, initialData]);

  const toggle = (id: string) => {
    const next = excluded.includes(id)
      ? excluded.filter((x) => x !== id)
      : [...excluded, id];
    setExcludedRaw(next.join(","));
  };

  const toggleGroup = (groupIds: string[]) => {
    const allExcluded = groupIds.every((id) => excluded.includes(id));
    const next = allExcluded
      ? excluded.filter((id) => !groupIds.includes(id))
      : Array.from(new Set([...excluded, ...groupIds]));
    setExcludedRaw(next.join(","));
  };

  const clearAll = () => setExcludedRaw("");

  if (!initialData || initialData.accounts.length === 0) return null;

  const groups = groupAccounts(initialData.accounts);
  const excludedCount = excluded.filter((id) =>
    initialData.accounts.some((a) => a.id === id)
  ).length;

  const label =
    excludedCount === 0
      ? "All accounts"
      : `${excludedCount} excluded`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 gap-1.5 text-xs"
          aria-label="Filter accounts"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Filter className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[260px] p-0">
        <Command>
          <CommandInput placeholder="Search accounts..." />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No accounts found.</CommandEmpty>
            {excludedCount > 0 && (
              <>
                <CommandGroup>
                  <CommandItem
                    onSelect={clearAll}
                    className="justify-center text-xs text-muted-foreground"
                  >
                    Clear ({excludedCount})
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            {groups.map((group) => {
              const groupIds = group.accounts.map((a) => a.id);
              const allExcluded = groupIds.every((id) =>
                excluded.includes(id)
              );
              return (
                <CommandGroup
                  key={group.type}
                  heading={formatAccountTypeName(group.type)}
                >
                  <CommandItem
                    value={`toggle-group-${group.type}`}
                    onSelect={() => toggleGroup(groupIds)}
                    className="text-xs text-muted-foreground"
                  >
                    <span className="ml-6">
                      {allExcluded ? "Include all" : "Exclude all"}
                    </span>
                  </CommandItem>
                  {group.accounts.map((account) => {
                    const isExcluded = excluded.includes(account.id);
                    return (
                      <CommandItem
                        key={account.id}
                        value={`${group.type}-${account.name}-${account.id}`}
                        onSelect={() => toggle(account.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isExcluded ? "opacity-0" : "opacity-100"
                          )}
                        />
                        <span
                          className={cn(
                            isExcluded && "text-muted-foreground line-through"
                          )}
                        >
                          {account.name}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
