"use server";

import { and, asc, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  financialAccounts,
  monthlyEntries,
  incomeStreams,
  expenses,
  expenseCategories,
} from "@/db/schema";
import { getUserId } from "@/lib/auth-helpers";
import { getExchangeRates } from "@/lib/fx-rates-server";
import { getMonthlyExpenseTotals } from "@/lib/expenses-server";
import { getCategories, type CategoryRow } from "@/app/actions/expense-categories";
import type { ExpenseRow } from "@/app/actions/expenses";
import type { AccountType } from "@/lib/types";
import type { Currency } from "@/lib/fx-rates";
import type { IncomeStreamDraft } from "@/app/actions/income";

export interface CheckinStatus {
  /** Previous completed calendar month, "YYYY-MM". */
  month: string;
  /** Short label for the month, e.g. "July". */
  monthLabel: string;
  openAccountCount: number;
  /** Open accounts with no entry for `month`. */
  missingCount: number;
  /** True when every open account has a value for `month`. */
  done: boolean;
}

/** Previous completed calendar month as "YYYY-MM". */
function previousMonthKey(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function monthShortLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
  });
}

function monthBefore(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isLiabilityType(type: AccountType): boolean {
  return type === "Credit_Card" || type === "Loan";
}

/**
 * State for the "Check in" button in the top bar. Own accounts only —
 * viewers of a shared dashboard are not prompted to update it.
 */
export async function getCheckinStatus(): Promise<CheckinStatus | null> {
  try {
    const userId = await getUserId();
    const month = previousMonthKey();

    const openAccounts = await db
      .select({ id: financialAccounts.id })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.userId, userId),
          eq(financialAccounts.isClosed, false),
        ),
      );

    if (openAccounts.length === 0) return null;

    const accountIds = openAccounts.map((a) => a.id);
    const entries = await db
      .select({ accountId: monthlyEntries.accountId })
      .from(monthlyEntries)
      .where(
        and(
          inArray(monthlyEntries.accountId, accountIds),
          eq(monthlyEntries.month, month),
        ),
      );

    const updated = new Set(entries.map((e) => e.accountId));
    const missingCount = accountIds.filter((id) => !updated.has(id)).length;

    return {
      month,
      monthLabel: monthShortLabel(month),
      openAccountCount: openAccounts.length,
      missingCount,
      done: missingCount === 0,
    };
  } catch (error) {
    console.error("Error getting check-in status:", error);
    return null;
  }
}

// ============================================================================
// Check-in flow data
// ============================================================================

export interface CheckinAccountRow {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  isLiability: boolean;
  /** Most recent balance strictly before `month`, for prefill. */
  lastBalance: number | null;
  /** The month that balance came from, e.g. "2026-06". */
  lastBalanceMonth: string | null;
  /** Balance already saved for `month`, if any. */
  existingBalance: number | null;
}

export interface CheckinData {
  month: string;
  /** Default month the app suggests checking in (previous completed month). */
  defaultMonth: string;
  accounts: CheckinAccountRow[];
  /** Prefilled income lines: this month's if saved, else last month's. */
  incomeStreams: IncomeStreamDraft[];
  /** True when the income lines were carried over from an earlier month. */
  incomeCarried: boolean;
  /** Uncategorised expenses for the month, for the tidy-up step. */
  uncategorised: ExpenseRow[];
  categories: CategoryRow[];
}

export async function getCheckinData(month: string): Promise<CheckinData> {
  const userId = await getUserId();
  const defaultMonth = previousMonthKey();

  const accountRows = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.userId, userId),
        eq(financialAccounts.isClosed, false),
      ),
    )
    .orderBy(asc(financialAccounts.displayOrder), asc(financialAccounts.createdAt));

  const accountIds = accountRows.map((a) => a.id);

  // One query for all entries up to and including the month; split into
  // "entry for this month" and "latest before this month" per account.
  const entryRows =
    accountIds.length > 0
      ? await db
          .select({
            accountId: monthlyEntries.accountId,
            month: monthlyEntries.month,
            endingBalance: monthlyEntries.endingBalance,
          })
          .from(monthlyEntries)
          .where(inArray(monthlyEntries.accountId, accountIds))
          .orderBy(asc(monthlyEntries.month))
      : [];

  const lastBefore = new Map<string, { month: string; balance: number }>();
  const existing = new Map<string, number>();
  for (const row of entryRows) {
    if (row.month === month) {
      existing.set(row.accountId, Number(row.endingBalance));
    } else if (row.month < month) {
      const prev = lastBefore.get(row.accountId);
      if (!prev || row.month > prev.month) {
        lastBefore.set(row.accountId, {
          month: row.month,
          balance: Number(row.endingBalance),
        });
      }
    }
  }

  const accounts: CheckinAccountRow[] = accountRows.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currency: (a.currency ?? "GBP") as Currency,
    isLiability: isLiabilityType(a.type),
    lastBalance: lastBefore.get(a.id)?.balance ?? null,
    lastBalanceMonth: lastBefore.get(a.id)?.month ?? null,
    existingBalance: existing.get(a.id) ?? null,
  }));

  // Income: this month's saved lines, else the most recent prior month's
  // lines with their amounts (recurring income rarely changes).
  let incomeStreamsDrafts: IncomeStreamDraft[] = [];
  let incomeCarried = false;
  try {
    const current = await db
      .select()
      .from(incomeStreams)
      .where(
        and(eq(incomeStreams.userId, userId), eq(incomeStreams.month, month)),
      );

    if (current.length > 0) {
      incomeStreamsDrafts = current.map((r) => ({
        name: r.name,
        amount: Number(r.amount),
        currency: (r.currency ?? "GBP") as Currency,
      }));
    } else {
      const prior = await db
        .select()
        .from(incomeStreams)
        .where(
          and(eq(incomeStreams.userId, userId), lt(incomeStreams.month, month)),
        )
        .orderBy(desc(incomeStreams.month));
      const latestPrior = prior[0]?.month;
      if (latestPrior) {
        incomeStreamsDrafts = prior
          .filter((r) => r.month === latestPrior)
          .map((r) => ({
            name: r.name,
            amount: Number(r.amount),
            currency: (r.currency ?? "GBP") as Currency,
          }));
        incomeCarried = true;
      }
    }
  } catch (err) {
    console.error("Income streams unavailable for check-in:", err);
  }
  if (incomeStreamsDrafts.length === 0) {
    incomeStreamsDrafts = [{ name: "Salary", amount: 0, currency: "GBP" }];
  }

  // Budget stragglers: uncategorised expenses for this month.
  let uncategorised: ExpenseRow[] = [];
  let categories: CategoryRow[] = [];
  try {
    const [expenseRows, categoryRows] = await Promise.all([
      db
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.userId, userId),
            eq(expenses.month, month),
            isNull(expenses.categoryId),
          ),
        )
        .orderBy(desc(expenses.date)),
      getCategories(),
    ]);
    uncategorised = expenseRows.map((e) => ({
      id: e.id,
      date: e.date,
      month: e.month,
      amount: Number(e.amount),
      currency: (e.currency ?? "GBP") as Currency,
      description: e.description,
      merchant: e.merchant,
      categoryId: e.categoryId,
      accountId: e.accountId,
      source: e.source,
      importBatchId: e.importBatchId,
    }));
    categories = categoryRows;
  } catch (err) {
    console.error("Expenses unavailable for check-in:", err);
  }

  return {
    month,
    defaultMonth,
    accounts,
    incomeStreams: incomeStreamsDrafts,
    incomeCarried,
    uncategorised,
    categories,
  };
}

// ============================================================================
// The reveal: what this month did to your net worth
// ============================================================================

export interface CheckinSummary {
  month: string;
  /** All amounts in GBP (the base currency). */
  netWorth: number;
  prevNetWorth: number | null;
  delta: number | null;
  income: number;
  spend: number;
  saved: number;
  /** delta − saved: market moves, interest, revaluations. Null on first month. */
  growth: number | null;
  savingsRate: number | null;
  /** Sum of category targets (GBP); null when no targets are set. */
  plannedSpendGbp: number | null;
  /** False when the month has no expense rows — spend is unknown, not zero. */
  spendTracked: boolean;
  assetsTotal: number;
  liabilitiesTotal: number;
}

type RatesMap = Record<Currency, number>;

function toGbp(amount: number, currency: Currency, rates: RatesMap): number {
  if (currency === "GBP") return amount;
  const rate = rates[currency];
  if (!rate || rate === 0) return amount;
  return amount / rate;
}

/** Net worth in GBP for a month from that month's entries. Null if no entries. */
async function netWorthForMonth(
  userId: string,
  month: string,
  rates: RatesMap,
): Promise<{ netWorth: number; assets: number; liabilities: number } | null> {
  const rows = await db
    .select({
      endingBalance: monthlyEntries.endingBalance,
      type: financialAccounts.type,
      currency: financialAccounts.currency,
    })
    .from(monthlyEntries)
    .innerJoin(
      financialAccounts,
      eq(monthlyEntries.accountId, financialAccounts.id),
    )
    .where(
      and(
        eq(financialAccounts.userId, userId),
        eq(monthlyEntries.month, month),
      ),
    );

  if (rows.length === 0) return null;

  let assets = 0;
  let liabilities = 0;
  for (const row of rows) {
    const value = toGbp(
      Number(row.endingBalance),
      (row.currency ?? "GBP") as Currency,
      rates,
    );
    if (isLiabilityType(row.type)) liabilities += value;
    else assets += value;
  }
  return { netWorth: assets - liabilities, assets, liabilities };
}

export async function getCheckinSummary(month: string): Promise<CheckinSummary> {
  const userId = await getUserId();
  const prevMonth = monthBefore(month);

  // One rates lookup per month, shared by every conversion below.
  const [monthRates, prevRates] = await Promise.all([
    getExchangeRates(month).then((r) => r.rates),
    getExchangeRates(prevMonth).then((r) => r.rates),
  ]);

  const [current, previous] = await Promise.all([
    netWorthForMonth(userId, month, monthRates),
    netWorthForMonth(userId, prevMonth, prevRates),
  ]);

  // Income for the month, converted to GBP.
  let income = 0;
  try {
    const streams = await db
      .select()
      .from(incomeStreams)
      .where(
        and(eq(incomeStreams.userId, userId), eq(incomeStreams.month, month)),
      );
    for (const s of streams) {
      income += toGbp(
        Number(s.amount),
        (s.currency ?? "GBP") as Currency,
        monthRates,
      );
    }
  } catch (err) {
    console.error("Income unavailable for check-in summary:", err);
  }

  // Spend: budget module only. A month with no expense rows has UNKNOWN
  // spend, not zero — the reveal says so instead of faking a savings rate.
  let spend = 0;
  const expenseTotals = (await getMonthlyExpenseTotals([userId])).get(month);
  const spendTracked = !!expenseTotals && expenseTotals.length > 0;
  if (expenseTotals) {
    for (const t of expenseTotals) {
      spend += toGbp(t.amount, t.currency, monthRates);
    }
  }

  // The plan, if targets are set: lets the reveal say "vs £X planned".
  let plannedSpendGbp: number | null = null;
  try {
    const targetRows = await db
      .select({
        monthlyTarget: expenseCategories.monthlyTarget,
        excludeFromSpend: expenseCategories.excludeFromSpend,
        archivedAt: expenseCategories.archivedAt,
      })
      .from(expenseCategories)
      .where(eq(expenseCategories.userId, userId));
    const total = targetRows
      .filter((r) => !r.excludeFromSpend && r.archivedAt === null)
      .reduce((sum, r) => sum + (r.monthlyTarget ? Number(r.monthlyTarget) : 0), 0);
    plannedSpendGbp = total > 0 ? total : null;
  } catch {
    // Column may not exist until the migration runs — the reveal just omits the plan.
  }

  const netWorth = current?.netWorth ?? 0;
  const prevNetWorth = previous?.netWorth ?? null;
  const delta = prevNetWorth === null ? null : netWorth - prevNetWorth;
  const saved = income - spend;

  return {
    month,
    netWorth,
    prevNetWorth,
    delta,
    income,
    spend,
    saved,
    growth: delta === null ? null : delta - saved,
    savingsRate: spendTracked && income > 0 ? (saved / income) * 100 : null,
    plannedSpendGbp,
    spendTracked,
    assetsTotal: current?.assets ?? 0,
    liabilitiesTotal: current?.liabilities ?? 0,
  };
}
