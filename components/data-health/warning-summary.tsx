"use client";

import { AlertTriangle, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import type { DataHealthWarning, WarningCode } from "@/lib/data-health";

interface WarningSummaryProps {
  warnings: DataHealthWarning[];
}

export function WarningSummary({ warnings }: WarningSummaryProps) {
  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span>No data-health issues detected.</span>
      </div>
    );
  }

  const counts = warnings.reduce(
    (acc, w) => {
      acc[w.code] = (acc[w.code] ?? 0) + 1;
      return acc;
    },
    {} as Record<WarningCode, number>,
  );

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {(counts.INCOME_GT_CASHIN ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 px-2 py-1">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>
            {counts.INCOME_GT_CASHIN} income &gt; cash-in
            {counts.INCOME_GT_CASHIN === 1 ? "" : "s"}
          </span>
        </div>
      )}
      {(counts.GROWTH_ON_CURRENT ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 px-2 py-1">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>
            {counts.GROWTH_ON_CURRENT} unexplained balance change
            {counts.GROWTH_ON_CURRENT === 1 ? "" : "s"}
          </span>
        </div>
      )}
      {(counts.POSSIBLE_TRANSFER ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 rounded-md border border-sky-500/40 bg-sky-500/5 px-2 py-1">
          <ArrowLeftRight className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          <span>
            {counts.POSSIBLE_TRANSFER} possible transfer
            {counts.POSSIBLE_TRANSFER === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}
