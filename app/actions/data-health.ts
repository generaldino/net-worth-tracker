"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  exchangeRates as exchangeRatesTable,
  financialAccounts as accountsTable,
  monthlyEntries,
} from "@/db/schema";
import type { Currency } from "@/lib/fx-rates";
import { getAccessibleUserIds } from "@/app/actions/sharing";
import { getUserId } from "@/lib/auth-helpers";
import {
  computeAllWarnings,
  type CheckAccount,
  type CheckEntry,
  type DataHealthWarning,
  type FxRatesByMonth,
} from "@/lib/data-health";
import type { Account, MonthlyEntry } from "@/lib/types";
import { computeExpenditure } from "@/lib/account-helpers";
import { fetchAndSaveExchangeRatesForMonth } from "@/lib/fx-rates-server";
import { revalidatePath } from "next/cache";

export interface DataHealthContext {
  account: CheckAccount;
  previousEntry: CheckEntry | null;
  gbpMultiplier: number;
}

export interface DataHealthMonthContext {
  accounts: CheckAccount[];
  previousEntries: Array<{ accountId: string; entry: CheckEntry }>;
  fxRate: Record<Currency, number> | null;
  monthEntriesByAccount: Array<{ accountId: string; entry: CheckEntry }>;
}

export interface MonthEditorData {
  month: string;
  accounts: Account[];
  existingEntries: MonthlyEntry[];
}

export interface SaveMonthlyEntryInput {
  accountId: string;
  endingBalance: number;
  cashIn: number;
  cashOut: number;
  income: number;
}

export interface SaveMonthlyEntriesResult {
  success: boolean;
  savedCount: number;
  errors: Array<{ accountId: string; message: string }>;
}

export interface DataHealthReport {
  warnings: DataHealthWarning[];
  monthsCovered: string[];
  accountCount: number;
  entryCount: number;
}

async function loadAccessibleAccounts(): Promise<CheckAccount[]> {
  const accessibleUserIds = await getAccessibleUserIds();
  if (accessibleUserIds.length === 0) return [];
  const rows = await db
    .select()
    .from(accountsTable)
    .where(inArray(accountsTable.userId, accessibleUserIds));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    currency: (row.currency ?? "GBP") as Currency,
  }));
}

function toCheckEntry(row: typeof monthlyEntries.$inferSelect): CheckEntry {
  return {
    accountId: row.accountId,
    month: row.month,
    endingBalance: Number(row.endingBalance),
    cashIn: Number(row.cashIn),
    cashOut: Number(row.cashOut),
    income: Number(row.income ?? 0),
  };
}

async function loadFxRatesByMonth(
  months: Iterable<string>,
): Promise<FxRatesByMonth> {
  const uniqueMonths = Array.from(new Set(months));
  if (uniqueMonths.length === 0) return new Map();

  const dateStrs = uniqueMonths.map((m) => {
    const [y, mo] = m.split("-").map(Number);
    return new Date(Date.UTC(y, mo, 0)).toISOString().split("T")[0];
  });

  const rows = await db
    .select()
    .from(exchangeRatesTable)
    .where(inArray(exchangeRatesTable.date, dateStrs));

  const dateToMonth = new Map(
    dateStrs.map((dateStr, i) => [dateStr, uniqueMonths[i]]),
  );

  const out = new Map<string, Record<Currency, number>>();
  for (const row of rows) {
    const month = dateToMonth.get(row.date);
    if (!month) continue;
    out.set(month, {
      GBP: Number(row.gbpRate),
      EUR: Number(row.eurRate),
      USD: Number(row.usdRate),
      AED: Number(row.aedRate),
    });
  }

  const result = new Map<string, Record<Currency, number> | null>();
  for (const m of uniqueMonths) {
    result.set(m, out.get(m) ?? null);
  }
  return result;
}

export async function getDataHealthReport(): Promise<DataHealthReport> {
  const accounts = await loadAccessibleAccounts();
  if (accounts.length === 0) {
    return { warnings: [], monthsCovered: [], accountCount: 0, entryCount: 0 };
  }

  const accountIds = accounts.map((a) => a.id);
  const rows = await db
    .select()
    .from(monthlyEntries)
    .where(inArray(monthlyEntries.accountId, accountIds))
    .orderBy(asc(monthlyEntries.month));

  const entries = rows.map(toCheckEntry);
  const months = new Set(entries.map((e) => e.month));
  const fx = await loadFxRatesByMonth(months);

  const warnings = computeAllWarnings(entries, accounts, fx);

  return {
    warnings,
    monthsCovered: Array.from(months).sort(),
    accountCount: accounts.length,
    entryCount: entries.length,
  };
}

export async function getMonthEditorData(
  month: string,
): Promise<MonthEditorData> {
  const accessibleUserIds = await getAccessibleUserIds();
  if (accessibleUserIds.length === 0) {
    return { month, accounts: [], existingEntries: [] };
  }

  const rows = await db
    .select()
    .from(accountsTable)
    .where(inArray(accountsTable.userId, accessibleUserIds));

  const accounts: Account[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    isISA: row.isISA,
    owner: row.owner,
    category: row.category,
    isClosed: row.isClosed,
    closedAt: row.closedAt,
    currency: row.currency,
    displayOrder: row.displayOrder,
  }));

  const accountIds = accounts.map((a) => a.id);
  if (accountIds.length === 0) {
    return { month, accounts, existingEntries: [] };
  }

  const entryRows = await db
    .select()
    .from(monthlyEntries)
    .where(
      and(
        inArray(monthlyEntries.accountId, accountIds),
        eq(monthlyEntries.month, month),
      ),
    );

  const existingEntries: MonthlyEntry[] = entryRows.map((e) => ({
    accountId: e.accountId,
    monthKey: e.month,
    month: e.month,
    endingBalance: Number(e.endingBalance),
    cashIn: Number(e.cashIn),
    cashOut: Number(e.cashOut),
    income: Number(e.income ?? 0),
    expenditure: Number(e.expenditure ?? 0),
    internalTransfersOut: Number(e.internalTransfersOut ?? 0),
    debtPayments: Number(e.debtPayments ?? 0),
    cashFlow: Number(e.cashIn) - Number(e.cashOut),
    accountGrowth: 0,
  }));

  return { month, accounts, existingEntries };
}

export async function saveMonthlyEntriesForMonth(
  month: string,
  entries: SaveMonthlyEntryInput[],
): Promise<SaveMonthlyEntriesResult> {
  await getUserId();

  const accessibleUserIds = await getAccessibleUserIds();
  if (accessibleUserIds.length === 0) {
    return {
      success: false,
      savedCount: 0,
      errors: [{ accountId: "", message: "Not authenticated" }],
    };
  }

  const accountIds = entries.map((e) => e.accountId);
  if (accountIds.length === 0) {
    return { success: true, savedCount: 0, errors: [] };
  }

  const accounts = await db
    .select()
    .from(accountsTable)
    .where(
      and(
        inArray(accountsTable.userId, accessibleUserIds),
        inArray(accountsTable.id, accountIds),
      ),
    );
  const accountsById = new Map(accounts.map((a) => [a.id, a]));

  const existing = await db
    .select()
    .from(monthlyEntries)
    .where(
      and(
        inArray(monthlyEntries.accountId, accountIds),
        eq(monthlyEntries.month, month),
      ),
    );
  const existingByAccount = new Map(existing.map((e) => [e.accountId, e]));

  const errors: SaveMonthlyEntriesResult["errors"] = [];
  let savedCount = 0;

  for (const input of entries) {
    const account = accountsById.get(input.accountId);
    if (!account) {
      errors.push({
        accountId: input.accountId,
        message: "Account not accessible",
      });
      continue;
    }
    const expenditure = computeExpenditure(account.type, input.cashOut);
    const isIncomeAccount = account.type === "Current";
    const payload = {
      endingBalance: input.endingBalance.toString(),
      cashIn: input.cashIn.toString(),
      cashOut: input.cashOut.toString(),
      income: isIncomeAccount ? (input.income || 0).toString() : "0",
      internalTransfersOut: "0",
      debtPayments: "0",
      expenditure: expenditure.toString(),
      updatedAt: new Date(),
    };

    try {
      if (existingByAccount.has(input.accountId)) {
        await db
          .update(monthlyEntries)
          .set(payload)
          .where(
            and(
              eq(monthlyEntries.accountId, input.accountId),
              eq(monthlyEntries.month, month),
            ),
          );
      } else {
        await db.insert(monthlyEntries).values({
          accountId: input.accountId,
          month,
          ...payload,
        });
      }
      savedCount += 1;
    } catch (err) {
      errors.push({
        accountId: input.accountId,
        message: err instanceof Error ? err.message : "Save failed",
      });
    }
  }

  try {
    await fetchAndSaveExchangeRatesForMonth(month);
  } catch {
    // non-blocking
  }

  revalidatePath("/");
  revalidatePath("/data-health");
  revalidatePath("/accounts");

  return {
    success: errors.length === 0,
    savedCount,
    errors,
  };
}

export async function getMonthDataHealthContext(
  month: string,
): Promise<DataHealthMonthContext> {
  const accounts = await loadAccessibleAccounts();
  if (accounts.length === 0) {
    return {
      accounts: [],
      previousEntries: [],
      fxRate: null,
      monthEntriesByAccount: [],
    };
  }

  const accountIds = accounts.map((a) => a.id);
  const rows = await db
    .select()
    .from(monthlyEntries)
    .where(inArray(monthlyEntries.accountId, accountIds))
    .orderBy(asc(monthlyEntries.month));

  const prev = new Map<string, CheckEntry>();
  const sameMonth: Array<{ accountId: string; entry: CheckEntry }> = [];
  for (const row of rows) {
    const entry = toCheckEntry(row);
    if (entry.month < month) {
      const existing = prev.get(entry.accountId);
      if (!existing || entry.month > existing.month) {
        prev.set(entry.accountId, entry);
      }
    } else if (entry.month === month) {
      sameMonth.push({ accountId: entry.accountId, entry });
    }
  }

  const fx = await loadFxRatesByMonth([month]);

  return {
    accounts,
    previousEntries: Array.from(prev.entries()).map(([accountId, entry]) => ({
      accountId,
      entry,
    })),
    fxRate: fx.get(month) ?? null,
    monthEntriesByAccount: sameMonth,
  };
}
