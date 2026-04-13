"use client";

import React, { useCallback, useRef, useState } from "react";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";

interface Segment {
  name: string;
  value: number;
  color: string;
}

interface MousePos {
  x: number;
  y: number;
}

// Shared state + handlers for "tooltip per stacked bar segment".
// Recharts' built-in shared tooltip lists every series in the stack; we want
// only the one under the cursor, so we drive it ourselves from each <Bar>'s
// onMouseEnter and from the wrapping div's mousemove for positioning.
export function useBarSegmentTooltip() {
  const [segment, setSegment] = useState<Segment | null>(null);
  const [pos, setPos] = useState<MousePos | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setSegment(null);
    setPos(null);
  }, []);

  // Bar onMouseEnter receives a BarRectangleItem with .payload (the data row).
  // We don't clear on Bar leave — the wrapper's onMouseLeave handles that, so
  // moving between adjacent stacked segments doesn't flicker the tooltip off.
  const makeBarProps = useCallback((name: string, color: string) => ({
    onMouseEnter: (data: { payload?: Record<string, unknown> }) => {
      const value = (data?.payload?.[name] as number) ?? 0;
      setSegment({ name, value, color });
    },
  }), []);

  return {
    segment,
    pos,
    containerRef,
    handleMouseMove,
    handleMouseLeave,
    makeBarProps,
  };
}

interface OverlayProps {
  segment: Segment | null;
  pos: MousePos | null;
  chartCurrency: Currency;
  formatLabel?: (name: string) => string;
}

export function BarSegmentTooltipOverlay({
  segment,
  pos,
  chartCurrency,
  formatLabel,
}: OverlayProps) {
  const { isMasked } = useMasking();
  const containerWidth =
    typeof window !== "undefined" ? window.innerWidth : 0;
  if (!segment || !pos) return null;
  const label = formatLabel ? formatLabel(segment.name) : segment.name;
  // Show absolute value — series like "Total Expenditure" are stored negative
  // for the chart but the user thinks of them as positive amounts.
  const display = isMasked
    ? "••••"
    : formatCurrencyAmount(Math.abs(segment.value), chartCurrency);

  // Flip to the left of the cursor when close to the right edge so the
  // tooltip never gets clipped by the chart container.
  const flip = containerWidth > 0 && pos.x > containerWidth - 180;
  return (
    <div
      className="pointer-events-none absolute z-20 rounded-md border border-border bg-popover px-2 py-1.5 text-xs shadow-md"
      style={{
        left: flip ? undefined : pos.x + 12,
        right: flip ? 12 : undefined,
        top: pos.y + 12,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-sm"
          style={{ backgroundColor: segment.color }}
        />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="mt-0.5 font-medium tabular-nums text-foreground">
        {display}
      </div>
    </div>
  );
}
