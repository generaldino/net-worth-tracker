"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StaleAccountsData } from "@/lib/types";

interface StaleAccountsBannerProps {
  staleAccountsData: StaleAccountsData;
  onUpdateNow: () => void;
}

export function StaleAccountsBanner({
  staleAccountsData,
  onUpdateNow,
}: StaleAccountsBannerProps) {
  if (staleAccountsData.staleEntries.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <span className="font-semibold">{staleAccountsData.missingAccountCount} account{staleAccountsData.missingAccountCount !== 1 ? "s" : ""}</span>
          {" "}need updating across{" "}
          <span className="font-semibold">{staleAccountsData.missingMonthCount} month{staleAccountsData.missingMonthCount !== 1 ? "s" : ""}</span>
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
        onClick={onUpdateNow}
      >
        Update Now
      </Button>
    </div>
  );
}
