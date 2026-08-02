"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Account, type AccountType } from "@/lib/types";
import {
  getMonthDataHealthContext,
  getMonthEditorData,
  saveMonthlyEntriesForMonth,
  type DataHealthMonthContext,
} from "@/app/actions/data-health";
import {
  saveIncomeStreams,
  type IncomeStreamDraft,
} from "@/app/actions/income";
import { IncomeStreamsEditor } from "@/components/income-streams-editor";
import { computeLiveWarnings, type CheckAccount } from "@/lib/data-health";
import { WarningList } from "@/components/data-health/warning-list";
import { WarningSummary } from "@/components/data-health/warning-summary";
import { getCurrencySymbol } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface MonthlyEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMonth: string;
  highlightAccountIds?: string[];
  onSaved?: () => void;
}

type DraftEntry = {
  accountId: string;
  accountType: AccountType;
  month: string;
  endingBalance: number;
};


export function MonthlyEntryDialog({
  open,
  onOpenChange,
  selectedMonth,
  highlightAccountIds,
  onSaved,
}: MonthlyEntryDialogProps) {
  const [month, setMonth] = useState(selectedMonth);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [incomeDrafts, setIncomeDrafts] = useState<IncomeStreamDraft[]>([]);
  const [healthContext, setHealthContext] =
    useState<DataHealthMonthContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const lastHighlighted = useRef<string | null>(null);

  useEffect(() => {
    if (open) setMonth(selectedMonth);
  }, [open, selectedMonth]);

  useEffect(() => {
    if (!open || !month) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getMonthEditorData(month), getMonthDataHealthContext(month)])
      .then(([editorData, ctx]) => {
        if (cancelled) return;
        setAccounts(editorData.accounts);
        setDrafts(
          editorData.accounts.map((account) => {
            const existing = editorData.existingEntries.find(
              (e) => e.accountId === account.id,
            );
            return {
              accountId: account.id,
              accountType: account.type,
              month,
              endingBalance: existing ? Number(existing.endingBalance) : 0,
            };
          }),
        );
        // Seed income streams: existing rows, else carry-forward names, else one blank line.
        const existingStreams = editorData.income.streams;
        if (existingStreams.length > 0) {
          setIncomeDrafts(
            existingStreams.map((s) => ({
              name: s.name,
              amount: s.amount,
              currency: s.currency,
            })),
          );
        } else if (editorData.income.suggestedNames.length > 0) {
          setIncomeDrafts(
            editorData.income.suggestedNames.map((name) => ({
              name,
              amount: 0,
              currency: "GBP" as Currency,
            })),
          );
        } else {
          setIncomeDrafts([{ name: "Salary", amount: 0, currency: "GBP" }]);
        }
        setHealthContext(ctx);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, month]);

  useEffect(() => {
    if (!open || isLoading) return;
    const first = highlightAccountIds?.[0];
    if (!first) return;
    if (lastHighlighted.current === first) return;
    const el = rowRefs.current.get(first);
    if (el) {
      lastHighlighted.current = first;
      const timer = setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, isLoading, highlightAccountIds]);

  useEffect(() => {
    if (!open) lastHighlighted.current = null;
  }, [open]);

  const dialogAccounts: CheckAccount[] = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currency: (a.currency ?? "GBP") as Currency,
        owner: a.owner ?? "",
      })),
    [accounts],
  );

  const liveWarnings = useMemo(() => {
    if (!healthContext) return [];
    // Balance-only drafts: cash-flow fields are 0, so cash-flow-based checks
    // are inert for new entries and only historical entries surface warnings.
    return computeLiveWarnings({
      entries: drafts.map((d) => ({
        accountId: d.accountId,
        month: d.month,
        endingBalance: d.endingBalance,
        cashIn: 0,
        cashOut: 0,
        income: 0,
      })),
      accounts: dialogAccounts,
      previousEntries: healthContext.previousEntries,
      fxRate: healthContext.fxRate,
    });
  }, [drafts, dialogAccounts, healthContext]);

  const warningsByAccount = useMemo(() => {
    const map = new Map<string, typeof liveWarnings>();
    for (const w of liveWarnings) {
      const arr = map.get(w.accountId) ?? [];
      arr.push(w);
      map.set(w.accountId, arr);
    }
    return map;
  }, [liveWarnings]);

  const highlightSet = useMemo(
    () => new Set(highlightAccountIds ?? []),
    [highlightAccountIds],
  );

  const handleBalanceChange = (accountId: string, value: string) => {
    const num = Number.parseFloat(value);
    const safe = Number.isFinite(num) ? num : 0;
    setDrafts((prev) =>
      prev.map((d) =>
        d.accountId === accountId ? { ...d, endingBalance: safe } : d,
      ),
    );
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const [entriesResult, incomeResult] = await Promise.all([
        saveMonthlyEntriesForMonth(
          month,
          drafts.map((d) => ({
            accountId: d.accountId,
            endingBalance: d.endingBalance,
          })),
        ),
        saveIncomeStreams(
          month,
          incomeDrafts.map((d) => ({
            name: d.name,
            amount: d.amount,
            currency: d.currency,
          })),
        ),
      ]);

      if (entriesResult.success && incomeResult.success) {
        toast({
          title: "Saved",
          description: `Updated ${entriesResult.savedCount} account${entriesResult.savedCount === 1 ? "" : "s"} for ${formatMonthLabel(month)}.`,
        });
        onSaved?.();
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Save failed",
          description:
            entriesResult.errors[0]?.message ??
            incomeResult.error ??
            "Some data could not be saved. Check the console for details.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Monthly Update</DialogTitle>
          <DialogDescription>
            Enter each account&rsquo;s value at the end of the month, plus any
            income you earned. That&rsquo;s all it takes to track your net worth.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="month" className="sm:text-right">
              Month
            </Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="sm:col-span-3"
            />
          </div>

          {liveWarnings.length > 0 && (
            <WarningSummary warnings={liveWarnings} />
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading entries…</p>
          ) : (
            <>
              {/* Income streams */}
              <div className="border rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-medium">Income this month</h4>
                  <p className="text-xs text-muted-foreground">
                    Add each income stream (salary, freelance, rental, …).
                  </p>
                </div>
                <IncomeStreamsEditor
                  streams={incomeDrafts}
                  onChange={setIncomeDrafts}
                />
              </div>

              {/* Account balances */}
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No accessible accounts.
                </p>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-medium">Account values</h4>
                  {accounts.map((account) => {
                    const draft = drafts.find(
                      (d) => d.accountId === account.id,
                    );
                    const accountWarnings =
                      warningsByAccount.get(account.id) ?? [];
                    const isHighlighted = highlightSet.has(account.id);

                    return (
                      <div
                        key={account.id}
                        ref={(el) => {
                          rowRefs.current.set(account.id, el);
                        }}
                        className={cn(
                          "border rounded-lg p-4 space-y-3 transition-shadow",
                          isHighlighted &&
                            "ring-2 ring-amber-400/70 border-amber-400/50",
                        )}
                      >
                        <div className="flex justify-between items-center gap-3">
                          <div>
                            <h4 className="font-medium">{account.name}</h4>
                            <span className="text-xs text-muted-foreground">
                              {account.type}
                              {account.owner ? ` · ${account.owner}` : ""} ·{" "}
                              {account.currency || "GBP"}{" "}
                              {getCurrencySymbol(account.currency || "GBP")}
                            </span>
                          </div>
                          <div className="w-40">
                            <Label className="text-xs text-muted-foreground">
                              Ending Balance
                            </Label>
                            <Input
                              type="number"
                              value={draft?.endingBalance || ""}
                              onChange={(e) =>
                                handleBalanceChange(account.id, e.target.value)
                              }
                              onFocus={(e) => e.currentTarget.select()}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        {accountWarnings.length > 0 && (
                          <WarningList
                            warnings={accountWarnings}
                            showAccount={false}
                            showMonth={false}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || isLoading}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatMonthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
