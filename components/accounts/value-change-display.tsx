"use client";

import { useMasking } from "@/contexts/masking-context";
import { formatCurrencyAmount, formatPercentage } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";

interface ValueChangeDisplayProps {
  absoluteChange: number;
  percentageChange: number;
  label?: string;
  className?: string;
  currency?: Currency;
}

export function ValueChangeDisplay({
  absoluteChange,
  percentageChange,
  label,
  className = "",
  currency = "GBP",
}: ValueChangeDisplayProps) {
  const { isMasked } = useMasking();

  return (
    <div className={className}>
      {label && <span className="text-muted-foreground">{label}</span>}
      <div
        className={`font-medium ${
          absoluteChange >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {isMasked ? (
          "••••••"
        ) : (
          <>
            {absoluteChange >= 0 ? "+" : ""}
            {formatCurrencyAmount(absoluteChange, currency)}
          </>
        )}
      </div>
      <div
        className={`text-xs font-mono tabular-nums ${
          percentageChange >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {formatPercentage(percentageChange, { showSign: true })})
      </div>
    </div>
  );
}
