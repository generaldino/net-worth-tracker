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
import { type Account, type AccountType, type MonthlyEntry } from "@/lib/types";
import {
  getMonthDataHealthContext,
  getMonthEditorData,
  saveMonthlyEntriesForMonth,
  type DataHealthMonthContext,
} from "@/app/actions/data-health";
import { computeLiveWarnings, type CheckAccount } from "@/lib/data-health";
import { WarningList } from "@/components/data-health/warning-list";
import { WarningSummary } from "@/components/data-health/warning-summary";
import { getCurrencySymbol, formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { shouldShowIncome, getFieldLabels } from "@/lib/account-helpers";
import { getFieldExplanation } from "@/lib/field-explanations";
import { InfoButton } from "@/components/ui/info-button";
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
  cashIn: number;
  cashOut: number;
  income: number;
  expenditure: number;
  /** True once the user has manually edited expenditure; otherwise it tracks cashOut. */
  expenditureEdited: boolean;
};

function toDraft(
  entry: MonthlyEntry | undefined,
  month: string,
  account: Account,
): DraftEntry {
  const cashOut = entry ? Number(entry.cashOut) : 0;
  const storedExpenditure = entry ? Number(entry.expenditure) : 0;
  // Treat a stored expenditure that differs from cashOut as a deliberate override.
  const tracksCashOut = !entry || expenditureMatchesCashOut(storedExpenditure, cashOut, account.type);
  return {
    accountId: account.id,
    accountType: account.type,
    month,
    endingBalance: entry ? Number(entry.endingBalance) : 0,
    cashIn: entry ? Number(entry.cashIn) : 0,
    cashOut,
    income: entry ? Number(entry.income) : 0,
    expenditure: tracksCashOut
      ? defaultExpenditure(account.type, cashOut)
      : storedExpenditure,
    expenditureEdited: !tracksCashOut,
  };
}

function defaultExpenditure(type: AccountType, cashOut: number) {
  return type === "Current" || type === "Credit_Card" ? cashOut : 0;
}

function expenditureMatchesCashOut(expenditure: number, cashOut: number, type: AccountType) {
  const expected = defaultExpenditure(type, cashOut);
  return Math.abs(expenditure - expected) < 0.01;
}

function isExpenditureField(type: AccountType) {
  return type === "Current" || type === "Credit_Card";
}

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
            return toDraft(existing, month, account);
          }),
        );
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
      // defer so the dialog has laid out
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
    return computeLiveWarnings({
      entries: drafts,
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

  const handleFieldChange = (
    accountId: string,
    field: "endingBalance" | "cashIn" | "cashOut" | "income" | "expenditure",
    value: string,
  ) => {
    const num = Number.parseFloat(value);
    const safe = Number.isFinite(num) ? num : 0;
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.accountId !== accountId) return d;
        if (field === "cashOut") {
          // Keep expenditure pinned to cashOut unless the user has overridden it.
          return {
            ...d,
            cashOut: safe,
            expenditure: d.expenditureEdited
              ? d.expenditure
              : defaultExpenditure(d.accountType, safe),
          };
        }
        if (field === "expenditure") {
          return { ...d, expenditure: safe, expenditureEdited: true };
        }
        return { ...d, [field]: safe };
      }),
    );
  };

  const handleResetExpenditure = (accountId: string) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.accountId === accountId
          ? {
              ...d,
              expenditure: defaultExpenditure(d.accountType, d.cashOut),
              expenditureEdited: false,
            }
          : d,
      ),
    );
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const result = await saveMonthlyEntriesForMonth(
        month,
        drafts.map((d) => ({
          accountId: d.accountId,
          endingBalance: d.endingBalance,
          cashIn: d.cashIn,
          cashOut: d.cashOut,
          income: d.income,
          // Only send an explicit expenditure when the user has overridden the default.
          ...(d.expenditureEdited ? { expenditure: d.expenditure } : {}),
        })),
      );
      if (result.success) {
        toast({
          title: "Saved",
          description: `Updated ${result.savedCount} entr${result.savedCount === 1 ? "y" : "ies"} for ${formatMonthLabel(month)}.`,
        });
        onSaved?.();
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Save failed",
          description:
            result.errors[0]?.message ??
            "Some entries could not be saved. Check the console for details.",
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
          <DialogTitle>Monthly Account Values</DialogTitle>
          <DialogDescription>
            Review the ending balance and cash flow recorded for each account
            this month. Edit any value and save to reconcile.
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
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accessible accounts.
            </p>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => {
                const draft = drafts.find((d) => d.accountId === account.id);
                const { contributionsLabel, withdrawalsLabel } = getFieldLabels(
                  account.type,
                );
                const showIncome = shouldShowIncome(account.type);
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
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{account.name}</h4>
                        <span className="text-xs text-muted-foreground">
                          {account.type}
                          {account.owner ? ` · ${account.owner}` : ""} ·{" "}
                          {account.currency || "GBP"}{" "}
                          {getCurrencySymbol(account.currency || "GBP")}
                        </span>
                      </div>
                      {draft && (
                        <span className="text-xs text-muted-foreground">
                          Ending{" "}
                          {formatCurrencyAmount(
                            draft.endingBalance,
                            account.currency || "GBP",
                          )}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Label className="text-sm">Ending Balance</Label>
                          {(() => {
                            const explanation = getFieldExplanation(
                              account.type,
                              "endingBalance",
                            );
                            return explanation ? (
                              <InfoButton
                                title={explanation.title}
                                description={explanation.description}
                              />
                            ) : null;
                          })()}
                        </div>
                        <Input
                          type="number"
                          value={draft?.endingBalance ?? 0}
                          onChange={(e) =>
                            handleFieldChange(
                              account.id,
                              "endingBalance",
                              e.target.value,
                            )
                          }
                          placeholder="0"
                        />
                      </div>
                      {showIncome && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Label className="text-sm">Income</Label>
                            {(() => {
                              const explanation = getFieldExplanation(
                                account.type,
                                "income",
                              );
                              return explanation ? (
                                <InfoButton
                                  title={explanation.title}
                                  description={explanation.description}
                                />
                              ) : null;
                            })()}
                          </div>
                          <Input
                            type="number"
                            value={draft?.income ?? 0}
                            onChange={(e) =>
                              handleFieldChange(
                                account.id,
                                "income",
                                e.target.value,
                              )
                            }
                            placeholder="0"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Label className="text-sm">{contributionsLabel}</Label>
                          {(() => {
                            const explanation = getFieldExplanation(
                              account.type,
                              "cashIn",
                            );
                            return explanation ? (
                              <InfoButton
                                title={explanation.title}
                                description={explanation.description}
                              />
                            ) : null;
                          })()}
                        </div>
                        <Input
                          type="number"
                          value={draft?.cashIn ?? 0}
                          onChange={(e) =>
                            handleFieldChange(
                              account.id,
                              "cashIn",
                              e.target.value,
                            )
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Label className="text-sm">{withdrawalsLabel}</Label>
                          {(() => {
                            const explanation = getFieldExplanation(
                              account.type,
                              "cashOut",
                            );
                            return explanation ? (
                              <InfoButton
                                title={explanation.title}
                                description={explanation.description}
                              />
                            ) : null;
                          })()}
                        </div>
                        <Input
                          type="number"
                          value={draft?.cashOut ?? 0}
                          onChange={(e) =>
                            handleFieldChange(
                              account.id,
                              "cashOut",
                              e.target.value,
                            )
                          }
                          placeholder="0"
                        />
                      </div>
                      {draft && isExpenditureField(account.type) && (
                        <div className="space-y-1 sm:col-span-2">
                          <div className="flex items-center gap-1">
                            <Label className="text-sm">Expenditure</Label>
                            {(() => {
                              const explanation = getFieldExplanation(
                                account.type,
                                "expenditure",
                              );
                              return explanation ? (
                                <InfoButton
                                  title={explanation.title}
                                  description={explanation.description}
                                />
                              ) : null;
                            })()}
                            {draft.expenditureEdited ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleResetExpenditure(account.id)
                                }
                                className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                              >
                                Reset to {withdrawalsLabel.toLowerCase()}
                              </button>
                            ) : (
                              <span className="ml-auto text-[10px] text-muted-foreground">
                                Auto — tracks {withdrawalsLabel.toLowerCase()}
                              </span>
                            )}
                          </div>
                          <Input
                            type="number"
                            value={draft.expenditure}
                            onChange={(e) =>
                              handleFieldChange(
                                account.id,
                                "expenditure",
                                e.target.value,
                              )
                            }
                            placeholder="0"
                          />
                          {draft.expenditureEdited &&
                            draft.cashOut > draft.expenditure && (
                              <p className="text-[11px] text-muted-foreground">
                                Transfer amount: {" "}
                                {formatCurrencyAmount(
                                  draft.cashOut - draft.expenditure,
                                  account.currency || "GBP",
                                )}{" "}
                                (excluded from savings rate).
                              </p>
                            )}
                        </div>
                      )}
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
            {isSaving ? "Saving…" : "Save Entries"}
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
