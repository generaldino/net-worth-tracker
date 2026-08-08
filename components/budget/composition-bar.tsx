"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { colorVariantsBackground } from "@/lib/color-variants";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { CategoryTotalRow } from "@/components/budget/category-bars";

interface CompositionBarProps {
  totals: CategoryTotalRow[];
  activeFilter: string | null;
  onFilter: (categoryId: string | null) => void;
}

const UNCATEGORISED = "__uncategorised__";

function swatch(color: string) {
  return (
    colorVariantsBackground[color as keyof typeof colorVariantsBackground] ??
    colorVariantsBackground.blue
  );
}

/**
 * "Where did it go?" in one glance: a 100%-stacked bar of the month's spend,
 * largest share first. Tapping a segment drills into that category — the same
 * action as tapping its bar below. A bar rather than a donut: lengths compare
 * better than angles, it holds up at phone width, and it speaks the same
 * visual language as "Your mix" on the Net Worth page.
 */
export function CompositionBar({
  totals,
  activeFilter,
  onFilter,
}: CompositionBarProps) {
  const segments = useMemo(() => {
    const spend = totals.filter((t) => !t.excludeFromSpend && t.total > 0);
    const sum = spend.reduce((acc, t) => acc + t.total, 0);
    if (sum <= 0) return [];
    return spend
      .sort((a, b) => b.total - a.total)
      .map((t) => ({
        key: t.categoryId ?? UNCATEGORISED,
        name: t.categoryId ? t.name : "Uncategorised",
        color: t.categoryId ? swatch(t.color) : "bg-muted-foreground/40",
        total: t.total,
        share: (t.total / sum) * 100,
      }));
  }, [totals]);

  if (segments.length === 0) return null;

  return (
    <div className="space-y-2">
      <div
        className="flex h-5 w-full overflow-hidden rounded-full"
        role="img"
        aria-label="Share of spending by category"
      >
        {segments.map((seg) => (
          <button
            key={seg.key}
            type="button"
            onClick={() => onFilter(activeFilter === seg.key ? null : seg.key)}
            className={cn(
              "h-full transition-opacity",
              seg.color,
              activeFilter && activeFilter !== seg.key
                ? "opacity-35"
                : "opacity-100 hover:opacity-80",
            )}
            style={{ width: `${seg.share}%` }}
            title={`${seg.name}: ${formatCurrencyAmount(seg.total, "GBP")} (${Math.round(seg.share)}%)`}
            aria-label={`${seg.name}: ${Math.round(seg.share)} percent`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map((seg) => (
          <button
            key={seg.key}
            type="button"
            onClick={() => onFilter(activeFilter === seg.key ? null : seg.key)}
            className={cn(
              "inline-flex items-center gap-1.5 hover:text-foreground",
              activeFilter === seg.key && "font-semibold text-foreground",
            )}
          >
            <span className={cn("size-2 rounded-full", seg.color)} />
            {seg.name} {Math.round(seg.share)}%
          </button>
        ))}
      </div>
    </div>
  );
}
