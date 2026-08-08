"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleSlash, FileUp, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  markNoActivity,
  unmarkNoActivity,
  type StatementCoverage,
} from "@/app/actions/statements";
import { getAccountTypeLabel } from "@/lib/account-helpers";

interface StatementCoverageStripProps {
  coverage: StatementCoverage;
  /** Open the import dialog preselected to this account. */
  onImport: (accountId: string) => void;
}

/**
 * One chip per spending account: statement in ✓, explicitly quiet ("no
 * activity"), or missing. Missing chips import in one tap; the ∅ button
 * records a month with genuinely nothing on the account. Coverage is
 * derived from the data, so there's nothing to untick when a real import
 * lands — the chip just turns green.
 */
export function StatementCoverageStrip({
  coverage,
  onImport,
}: StatementCoverageStripProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (coverage.totalCount === 0) return null;

  const setNoActivity = async (accountId: string, on: boolean) => {
    setPendingId(accountId);
    const result = on
      ? await markNoActivity(accountId, coverage.month)
      : await unmarkNoActivity(accountId, coverage.month);
    setPendingId(null);
    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Could not update",
        description: result.error,
      });
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        Statements
        {coverage.complete ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Check className="size-3" />
            all {coverage.totalCount} in
          </span>
        ) : (
          <span className="text-amber-700 dark:text-amber-400">
            {coverage.totalCount - coverage.coveredCount} missing
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {coverage.accounts.map((account) => {
          const busy = pendingId === account.accountId;

          if (account.rowCount > 0) {
            return (
              <span
                key={account.accountId}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400"
                title={`${account.rowCount} transaction${account.rowCount === 1 ? "" : "s"} imported`}
              >
                <Check className="size-3" />
                {account.accountName}
                <span className="opacity-70">{account.rowCount}</span>
              </span>
            );
          }

          if (account.noActivity) {
            return (
              <button
                key={account.accountId}
                type="button"
                disabled={busy}
                onClick={() => setNoActivity(account.accountId, false)}
                className="group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-foreground/30"
                title="Marked as no activity — click to undo"
              >
                <CircleSlash className="size-3" />
                {account.accountName}
                <span className="opacity-70">no activity</span>
                <Undo2 className="size-3 opacity-0 transition group-hover:opacity-70" />
              </button>
            );
          }

          return (
            <span
              key={account.accountId}
              className="inline-flex items-center overflow-hidden rounded-full border border-amber-500/40 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300"
            >
              <button
                type="button"
                onClick={() => onImport(account.accountId)}
                className="inline-flex items-center gap-1.5 py-1 pl-2.5 pr-1.5 transition hover:bg-amber-500/15"
                title={`Import a ${getAccountTypeLabel(account.type)} statement for ${account.accountName}`}
              >
                <FileUp className="size-3" />
                {account.accountName}
                <span className="font-medium">— import</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                onClick={() => setNoActivity(account.accountId, true)}
                className={cn(
                  "size-6 rounded-none border-l border-amber-500/30 text-amber-800/70 hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-300/70 dark:hover:text-amber-300",
                )}
                title="No activity this month"
              >
                <CircleSlash className="size-3" />
                <span className="sr-only">
                  Mark {account.accountName} as no activity
                </span>
              </Button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
