"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardPen,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { IncomeStreamsEditor } from "@/components/income-streams-editor";
import { ReviewPanel } from "@/components/budget/review-panel";
import { WarningList } from "@/components/data-health/warning-list";
import { computeLiveWarnings, type CheckAccount } from "@/lib/data-health";
import {
  getMonthDataHealthContext,
  saveMonthlyEntriesForMonth,
  type DataHealthMonthContext,
} from "@/app/actions/data-health";
import { saveIncomeStreams, type IncomeStreamDraft } from "@/app/actions/income";
import {
  getCheckinSummary,
  type CheckinData,
  type CheckinSummary,
} from "@/app/actions/checkin";
import { formatCurrencyAmount, getCurrencySymbol } from "@/lib/fx-rates";
import { getAccountTypeLabel } from "@/lib/account-helpers";
import { useMasking } from "@/contexts/masking-context";

interface CheckinFlowProps {
  data: CheckinData;
}

function formatMonthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function shortMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
  });
}

/** The last 12 completed months, newest first, always including `selected`. */
function recentMonths(selected: string): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  if (!months.includes(selected)) months.push(selected);
  return months.sort((a, b) => b.localeCompare(a));
}

export function CheckinFlow({ data }: CheckinFlowProps) {
  const router = useRouter();
  const { isMasked } = useMasking();

  // Drafts are strings so partial input ("-", "1.") doesn't fight the field;
  // parsed once on save and for the live checks.
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [incomeDrafts, setIncomeDrafts] = useState<IncomeStreamDraft[]>(
    data.incomeStreams,
  );
  const [healthContext, setHealthContext] =
    useState<DataHealthMonthContext | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState<CheckinSummary | null>(null);

  // Prefill: the saved value for this month, else the last known balance.
  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const account of data.accounts) {
      initial[account.id] = String(
        account.existingBalance ?? account.lastBalance ?? 0,
      );
    }
    setBalances(initial);
    setIncomeDrafts(data.incomeStreams);
    setSummary(null);
  }, [data]);

  const parsedBalance = useCallback(
    (accountId: string): number => {
      const num = Number.parseFloat(balances[accountId] ?? "");
      return Number.isFinite(num) ? num : 0;
    },
    [balances],
  );

  // Same live sanity checks the old month editor ran.
  useEffect(() => {
    let cancelled = false;
    getMonthDataHealthContext(data.month)
      .then((ctx) => {
        if (!cancelled) setHealthContext(ctx);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data.month]);

  const checkAccounts: CheckAccount[] = useMemo(
    () =>
      data.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        owner: "",
      })),
    [data.accounts],
  );

  const warningsByAccount = useMemo(() => {
    if (!healthContext) return new Map<string, ReturnType<typeof computeLiveWarnings>>();
    const warnings = computeLiveWarnings({
      entries: data.accounts.map((a) => ({
        accountId: a.id,
        month: data.month,
        endingBalance: parsedBalance(a.id),
        cashIn: 0,
        cashOut: 0,
        income: 0,
      })),
      accounts: checkAccounts,
      previousEntries: healthContext.previousEntries,
      fxRate: healthContext.fxRate,
    });
    const map = new Map<string, typeof warnings>();
    for (const w of warnings) {
      const arr = map.get(w.accountId) ?? [];
      arr.push(w);
      map.set(w.accountId, arr);
    }
    return map;
  }, [parsedBalance, data.accounts, data.month, checkAccounts, healthContext]);

  const changeMonth = (next: string) => {
    router.push(`/checkin?month=${next}`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const [entriesResult, incomeResult] = await Promise.all([
        saveMonthlyEntriesForMonth(
          data.month,
          data.accounts.map((a) => ({
            accountId: a.id,
            endingBalance: parsedBalance(a.id),
          })),
        ),
        saveIncomeStreams(
          data.month,
          incomeDrafts.map((d) => ({
            name: d.name,
            amount: d.amount,
            currency: d.currency,
          })),
        ),
      ]);

      if (!entriesResult.success || !incomeResult.success) {
        toast({
          variant: "destructive",
          title: "Save failed",
          description:
            entriesResult.errors?.[0]?.message ??
            incomeResult.error ??
            "Some data could not be saved.",
        });
        return;
      }

      const revealSummary = await getCheckinSummary(data.month);
      setSummary(revealSummary);
      // Refresh so the navbar chip flips to done.
      router.refresh();
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

  const mask = (formatted: string) => (isMasked ? "••••••" : formatted);

  // ------------------------------------------------------------------
  // The reveal
  // ------------------------------------------------------------------
  if (summary) {
    const deltaPositive = (summary.delta ?? 0) >= 0;
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-16">
        <div className="space-y-8 text-center">
          <div className="space-y-2">
            <PartyPopper className="mx-auto size-8 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-lg font-medium text-muted-foreground">
              {formatMonthLabel(summary.month)} is in the books
            </h1>
            <p className="text-4xl font-bold tabular-nums sm:text-5xl">
              {mask(formatCurrencyAmount(summary.netWorth, "GBP"))}
            </p>
            {summary.delta !== null && (
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  deltaPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {deltaPositive ? "up " : "down "}
                {mask(formatCurrencyAmount(Math.abs(summary.delta), "GBP"))}{" "}
                since last month
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-5 text-left">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Where the change came from
            </h2>
            <dl className="space-y-2.5 text-sm">
              {!summary.spendTracked && (
                <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  No spending recorded for this month yet — import a statement
                  or add expenses on the Budget page and the saved-vs-growth
                  split will complete itself.
                </p>
              )}
              {summary.spendTracked && (
              <div className="flex items-baseline justify-between gap-3">
                <dt>
                  You saved
                  <span className="block text-xs text-muted-foreground">
                    income {mask(formatCurrencyAmount(summary.income, "GBP"))} −
                    spending {mask(formatCurrencyAmount(summary.spend, "GBP"))}
                  </span>
                </dt>
                <dd
                  className={cn(
                    "font-semibold tabular-nums",
                    summary.saved >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {mask(formatCurrencyAmount(summary.saved, "GBP"))}
                </dd>
              </div>
              )}
              {summary.spendTracked && summary.growth !== null && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt>
                    Markets &amp; growth
                    <span className="block text-xs text-muted-foreground">
                      value changes not explained by saving
                    </span>
                  </dt>
                  <dd
                    className={cn(
                      "font-semibold tabular-nums",
                      summary.growth >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {mask(formatCurrencyAmount(summary.growth, "GBP"))}
                  </dd>
                </div>
              )}
              {summary.spendTracked && summary.plannedSpendGbp !== null && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt>
                    Spending vs plan
                    <span className="block text-xs text-muted-foreground">
                      budget for the month
                    </span>
                  </dt>
                  <dd
                    className={cn(
                      "font-semibold tabular-nums",
                      summary.spend <= summary.plannedSpendGbp
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {mask(formatCurrencyAmount(summary.spend, "GBP"))} of{" "}
                    {mask(formatCurrencyAmount(summary.plannedSpendGbp, "GBP"))}
                  </dd>
                </div>
              )}
              {summary.savingsRate !== null && (
                <div className="flex items-baseline justify-between gap-3 border-t pt-2.5">
                  <dt>Savings rate</dt>
                  <dd className="font-semibold tabular-nums">
                    {isMasked ? "••" : `${Math.round(summary.savingsRate)}%`}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Figures in GBP. That savings line is what grows your net worth —
              markets do the rest.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button asChild size="lg" className="gap-1.5">
              <Link href="/">
                See your net worth
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSummary(null)}
              className="text-muted-foreground"
            >
              Back to editing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // The form
  // ------------------------------------------------------------------
  if (data.accounts.length === 0) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Nothing to check in yet</h1>
        <p className="mt-2 text-muted-foreground">
          Add your accounts first — then this becomes a five-minute monthly
          ritual.
        </p>
        <Button asChild className="mt-5">
          <Link href="/accounts">Add accounts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardPen className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold sm:text-2xl">Monthly check-in</h1>
        </div>
        <Select value={data.month} onValueChange={changeMonth}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {recentMonths(data.month).map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className="space-y-6">
        {/* Income */}
        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="font-medium">Income in {formatMonthLabel(data.month)}</h2>
            <p className="text-xs text-muted-foreground">
              {data.incomeCarried
                ? "Carried over from last month — adjust anything that changed."
                : "One line per source: salary, freelance, rental…"}
            </p>
          </div>
          <IncomeStreamsEditor
            streams={incomeDrafts}
            onChange={setIncomeDrafts}
          />
        </section>

        {/* Balances */}
        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="font-medium">Account values at month end</h2>
            <p className="text-xs text-muted-foreground">
              Prefilled with the last value you entered — change the ones that
              moved, and saving confirms the rest.
            </p>
          </div>
          <div className="space-y-2.5">
            {data.accounts.map((account) => {
              const value = parsedBalance(account.id);
              const unchanged =
                account.lastBalance !== null &&
                value === account.lastBalance &&
                account.existingBalance === null;
              const accountWarnings = warningsByAccount.get(account.id) ?? [];
              return (
                <div
                  key={account.id}
                  className="rounded-lg border px-3 py-2.5 sm:px-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {account.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getAccountTypeLabel(account.type)}
                        {account.isLiability ? " · you owe" : ""} ·{" "}
                        {getCurrencySymbol(account.currency)}
                      </p>
                    </div>
                    <div className="w-36 shrink-0 text-right">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={balances[account.id] ?? ""}
                        onChange={(e) =>
                          setBalances((prev) => ({
                            ...prev,
                            [account.id]: e.target.value,
                          }))
                        }
                        onFocus={(e) => e.currentTarget.select()}
                        className="h-9 text-right tabular-nums"
                      />
                      <p className="mt-0.5 h-4 text-[11px] text-muted-foreground">
                        {account.existingBalance !== null ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" /> saved
                          </span>
                        ) : unchanged && account.lastBalanceMonth ? (
                          `same as ${shortMonth(account.lastBalanceMonth)}`
                        ) : null}
                      </p>
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
        </section>

        {/* Budget stragglers */}
        {data.uncategorised.length > 0 && data.categories.length > 0 && (
          <section>
            <ReviewPanel
              expenses={data.uncategorised}
              categories={data.categories}
            />
          </section>
        )}

        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              Save {formatMonthLabel(data.month)}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
