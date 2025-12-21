"use client";

import { useMasking } from "@/contexts/masking-context";

interface ValueChangeDisplayProps {
  absoluteChange: number;
  percentageChange: number;
  label?: string;
  className?: string;
}

export function ValueChangeDisplay({
  absoluteChange,
  percentageChange,
  label,
  className = "",
}: ValueChangeDisplayProps) {
  const { formatCurrency, isMasked } = useMasking();

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
            {absoluteChange >= 0 ? "+" : ""}£{formatCurrency(absoluteChange)}
          </>
        )}
      </div>
      <div
        className={`text-xs ${
          percentageChange >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {isMasked ? (
          "•••"
        ) : (
          <>
            ({percentageChange >= 0 ? "+" : ""}
            {percentageChange.toFixed(1)}%)
          </>
        )}
      </div>
    </div>
  );
}
