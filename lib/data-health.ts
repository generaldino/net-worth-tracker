import type { AccountType } from "./types";
import { formatCurrencyAmount, type Currency } from "./fx-rates";

export type WarningCode = "INCOME_GT_CASHIN" | "GROWTH_ON_CURRENT";

export type WarningSeverity = "warning" | "info";

export interface DataHealthWarning {
  code: WarningCode;
  severity: WarningSeverity;
  accountId: string;
  accountName: string;
  accountOwner: string;
  accountCurrency: Currency;
  accountType: AccountType;
  month: string;
  title: string;
  detail: string;
}

export interface CheckAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  owner: string;
}

export interface CheckEntry {
  accountId: string;
  month: string;
  endingBalance: number;
  cashIn: number;
  cashOut: number;
  income: number;
}

const CURRENT_GROWTH_PCT = 0.01;
const CURRENT_GROWTH_FLOW_PCT = 0.02;
const CURRENT_GROWTH_MIN_ABS_GBP = 50;
const DUST = 1;

export const WARNING_LABELS: Record<WarningCode, string> = {
  INCOME_GT_CASHIN: "Income > cash in",
  GROWTH_ON_CURRENT: "Unexplained balance change",
};

export function checkIncomeVsCashIn(
  entry: CheckEntry,
  account: CheckAccount,
): DataHealthWarning | null {
  if (account.type !== "Current") return null;
  if (entry.income <= entry.cashIn + DUST) return null;
  return {
    code: "INCOME_GT_CASHIN",
    severity: "warning",
    accountId: account.id,
    accountName: account.name,
    accountOwner: account.owner,
    accountCurrency: account.currency,
    accountType: account.type,
    month: entry.month,
    title: "Income exceeds cash in",
    detail: `Income of ${formatCurrencyAmount(entry.income, account.currency)} is greater than cash in of ${formatCurrencyAmount(entry.cashIn, account.currency)}. Income is part of cash in, so cash in should be at least as large.`,
  };
}

export function checkCurrentAccountGrowth(
  entry: CheckEntry,
  previousEntry: CheckEntry | null,
  account: CheckAccount,
  gbpMultiplier: number,
): DataHealthWarning | null {
  if (account.type !== "Current") return null;
  if (!previousEntry) return null;
  const cashFlow = entry.cashIn - entry.cashOut;
  const impliedGrowth =
    entry.endingBalance - previousEntry.endingBalance - cashFlow;
  const reference = Math.max(
    Math.abs(entry.endingBalance),
    Math.abs(previousEntry.endingBalance),
  );
  const flowReference = Math.max(
    Math.abs(entry.cashIn),
    Math.abs(entry.cashOut),
  );
  const balanceThreshold = reference * CURRENT_GROWTH_PCT;
  // Tolerate fees/FX spread/small timing differences as a fraction of the
  // month's flow volume. A £300 gap on a £50k throughput account is noise;
  // the same gap on a mostly-dormant account is a missing transaction.
  const flowThreshold = flowReference * CURRENT_GROWTH_FLOW_PCT;
  const absFloor = CURRENT_GROWTH_MIN_ABS_GBP * gbpMultiplier;
  const threshold = Math.max(balanceThreshold, flowThreshold, absFloor);
  if (Math.abs(impliedGrowth) < threshold) return null;
  const direction = impliedGrowth > 0 ? "up" : "down";
  return {
    code: "GROWTH_ON_CURRENT",
    severity: "warning",
    accountId: account.id,
    accountName: account.name,
    accountOwner: account.owner,
    accountCurrency: account.currency,
    accountType: account.type,
    month: entry.month,
    title: "Balance doesn't match cash flows",
    detail: `Ending balance went ${direction} by ${formatCurrencyAmount(Math.abs(impliedGrowth), account.currency)} more than cash in minus cash out explains (prev ${formatCurrencyAmount(previousEntry.endingBalance, account.currency)} → now ${formatCurrencyAmount(entry.endingBalance, account.currency)}, net cash flow ${formatCurrencyAmount(cashFlow, account.currency)}). A deposit, withdrawal, or transfer is likely missing.`,
  };
}

/**
 * FX shape: month (YYYY-MM) -> { GBP, EUR, USD, AED } where each rate is
 * "X units of currency per 1 GBP" (matches the exchange_rates table).
 * `null` is allowed if no rate exists for that month — callers fall back to 1:1.
 */
export type FxRatesByMonth = ReadonlyMap<
  string,
  Record<Currency, number> | null
>;

export interface LiveWarningInput {
  entries: ReadonlyArray<CheckEntry>;
  accounts: ReadonlyArray<CheckAccount>;
  previousEntries: ReadonlyArray<{ accountId: string; entry: CheckEntry }>;
  fxRate: Record<Currency, number> | null;
}

/**
 * Variant of computeAllWarnings for the in-progress state of a single-month
 * dialog. Takes the user's pending entries for `month` plus the most recent
 * known entry per account before `month`.
 */
export function computeLiveWarnings(input: LiveWarningInput): DataHealthWarning[] {
  const accountById = new Map(input.accounts.map((a) => [a.id, a]));
  const prevById = new Map(
    input.previousEntries.map((p) => [p.accountId, p.entry]),
  );
  const warnings: DataHealthWarning[] = [];

  for (const entry of input.entries) {
    const account = accountById.get(entry.accountId);
    if (!account) continue;

    const incomeWarning = checkIncomeVsCashIn(entry, account);
    if (incomeWarning) warnings.push(incomeWarning);

    const prev = prevById.get(entry.accountId) ?? null;
    const rate = input.fxRate?.[account.currency];
    const gbpMultiplier =
      account.currency === "GBP" || !rate || rate === 0 ? 1 : rate;
    const growthWarning = checkCurrentAccountGrowth(
      entry,
      prev,
      account,
      gbpMultiplier,
    );
    if (growthWarning) warnings.push(growthWarning);
  }

  return warnings;
}

export function computeAllWarnings(
  entries: ReadonlyArray<CheckEntry>,
  accounts: ReadonlyArray<CheckAccount>,
  fxRatesByMonth: FxRatesByMonth,
): DataHealthWarning[] {
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const warnings: DataHealthWarning[] = [];

  const entriesByAccount = new Map<string, CheckEntry[]>();
  for (const entry of entries) {
    const arr = entriesByAccount.get(entry.accountId) ?? [];
    arr.push(entry);
    entriesByAccount.set(entry.accountId, arr);
  }
  for (const arr of entriesByAccount.values()) {
    arr.sort((a, b) => a.month.localeCompare(b.month));
  }

  for (const [accountId, list] of entriesByAccount) {
    const account = accountById.get(accountId);
    if (!account) continue;

    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      const prev = i > 0 ? list[i - 1] : null;

      const incomeWarning = checkIncomeVsCashIn(entry, account);
      if (incomeWarning) warnings.push(incomeWarning);

      const rates = fxRatesByMonth.get(entry.month);
      const rate = rates?.[account.currency];
      const gbpMultiplier =
        account.currency === "GBP" || !rate || rate === 0 ? 1 : rate;
      const growthWarning = checkCurrentAccountGrowth(
        entry,
        prev,
        account,
        gbpMultiplier,
      );
      if (growthWarning) warnings.push(growthWarning);
    }
  }

  warnings.sort((a, b) => {
    if (a.month !== b.month) return b.month.localeCompare(a.month);
    if (a.severity !== b.severity) return a.severity === "warning" ? -1 : 1;
    return a.accountName.localeCompare(b.accountName);
  });

  return warnings;
}
