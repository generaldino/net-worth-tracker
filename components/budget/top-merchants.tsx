"use client";

import { Store } from "lucide-react";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { MerchantTotal } from "@/app/actions/budget";

interface TopMerchantsProps {
  merchants: MerchantTotal[];
}

/**
 * Where the money *actually* went. People change behaviour on merchants and
 * habits, not categories — "Deliveroo, £95 across 6 orders" lands where
 * "Dining +12%" doesn't.
 */
export function TopMerchants({ merchants }: TopMerchantsProps) {
  if (merchants.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Store className="size-4 text-muted-foreground" />
        Top merchants
      </h2>
      <div className="divide-y rounded-lg border bg-card">
        {merchants.map((m) => (
          <div
            key={m.merchant.toLowerCase()}
            className="flex items-baseline justify-between gap-3 px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium capitalize">
                {m.merchant}
              </p>
              <p className="text-xs text-muted-foreground">
                {m.count} transaction{m.count === 1 ? "" : "s"}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatCurrencyAmount(m.totalGbp, "GBP")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
