"use client";

import { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ChartData } from "./types";
import { getAccountTypePriority } from "./chart-shared";
import { getAccountTypeLabel } from "@/lib/account-helpers";
import type { AccountType } from "@/lib/types";

interface AccountVisibilityFilterProps {
  /** All accounts in the dataset (unfiltered), for the checkbox lists. */
  accounts: ChartData["accounts"];
  hiddenTypes: ReadonlySet<string>;
  hiddenAccountIds: ReadonlySet<string>;
  onToggleType: (type: string) => void;
  onToggleAccount: (accountId: string) => void;
  onReset: () => void;
}

/**
 * Hide whole types (e.g. Pension) or individual accounts from the Net Worth
 * page — "what does my position look like without X?". Purely a view filter:
 * nothing is changed or deleted, and the check-in still covers everything.
 */
export function AccountVisibilityFilter({
  accounts,
  hiddenTypes,
  hiddenAccountIds,
  onToggleType,
  onToggleAccount,
  onReset,
}: AccountVisibilityFilterProps) {
  const types = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of accounts) {
      counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort(
        (a, b) => getAccountTypePriority(a.type) - getAccountTypePriority(b.type),
      );
  }, [accounts]);

  const sortedAccounts = useMemo(
    () =>
      [...accounts].sort((a, b) => {
        const t = getAccountTypePriority(a.type) - getAccountTypePriority(b.type);
        if (t !== 0) return t;
        return a.name.localeCompare(b.name);
      }),
    [accounts],
  );

  const hiddenCount = useMemo(
    () =>
      accounts.filter(
        (a) => hiddenTypes.has(a.type) || hiddenAccountIds.has(a.id),
      ).length,
    [accounts, hiddenTypes, hiddenAccountIds],
  );

  if (accounts.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hiddenCount > 0 ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1.5"
        >
          <SlidersHorizontal className="size-3.5" />
          <span className="hidden sm:inline">Filter</span>
          {hiddenCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-4 px-1 text-[10px]"
            >
              {hiddenCount} hidden
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="max-h-[60svh] overflow-y-auto p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Untick to hide from the charts — nothing is deleted, and the
            check-in still covers every account.
          </p>

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Types
          </p>
          <div className="space-y-1.5">
            {types.map(({ type, count }) => (
              <Label
                key={type}
                className="flex cursor-pointer items-center gap-2 text-sm font-normal"
              >
                <Checkbox
                  checked={!hiddenTypes.has(type)}
                  onCheckedChange={() => onToggleType(type)}
                />
                <span className="flex-1">
                  {getAccountTypeLabel(type as AccountType)}
                </span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </Label>
            ))}
          </div>

          <p className="mb-1.5 mt-3 border-t pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Accounts
          </p>
          <div className="space-y-1.5">
            {sortedAccounts.map((account) => {
              const typeHidden = hiddenTypes.has(account.type);
              return (
                <Label
                  key={account.id}
                  className={
                    "flex cursor-pointer items-center gap-2 text-sm font-normal" +
                    (typeHidden ? " opacity-50" : "")
                  }
                >
                  <Checkbox
                    checked={!typeHidden && !hiddenAccountIds.has(account.id)}
                    disabled={typeHidden}
                    onCheckedChange={() => onToggleAccount(account.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{account.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {getAccountTypeLabel(account.type as AccountType)}
                  </span>
                </Label>
              );
            })}
          </div>
        </div>
        {hiddenCount > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full text-xs"
              onClick={onReset}
            >
              Show everything
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
