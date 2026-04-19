import type { AccountType } from "./types";
import { formatCurrencyAmount, type Currency } from "./fx-rates";

export type WarningCode =
  | "INCOME_GT_CASHIN"
  | "GROWTH_ON_CURRENT"
  | "POSSIBLE_TRANSFER";

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
  counterparty?: {
    accountId: string;
    accountName: string;
    accountOwner: string;
    accountCurrency: Currency;
  };
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
const CURRENT_GROWTH_MIN_ABS_GBP = 50;
const TRANSFER_PCT_TOLERANCE = 0.02;
const TRANSFER_MIN_GBP_TOLERANCE = 50;
const DUST = 1;

export const WARNING_LABELS: Record<WarningCode, string> = {
  INCOME_GT_CASHIN: "Income > cash in",
  GROWTH_ON_CURRENT: "Unexplained balance change",
  POSSIBLE_TRANSFER: "Possible internal transfer",
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
  const pctThreshold = reference * CURRENT_GROWTH_PCT;
  const absFloor = CURRENT_GROWTH_MIN_ABS_GBP * gbpMultiplier;
  const threshold = Math.max(pctThreshold, absFloor);
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
 * Scan one month of entries across multiple accounts. For each cashOut,
 * find the single best-matching cashIn on a different account (same GBP
 * amount within tolerance). Each inflow is claimed by at most one outflow,
 * and a warning is emitted per matched outflow.
 */
export function detectPossibleTransfers(
  monthEntries: ReadonlyArray<CheckEntry & { account: CheckAccount }>,
  toGBP: (amount: number, currency: Currency) => number,
): DataHealthWarning[] {
  const warnings: DataHealthWarning[] = [];
  const outflows = monthEntries
    .filter((e) => e.cashOut > DUST)
    .map((e) => ({ entry: e, gbp: toGBP(e.cashOut, e.account.currency) }));
  const inflows = monthEntries
    .filter((e) => e.cashIn > DUST)
    .map((e) => ({ entry: e, gbp: toGBP(e.cashIn, e.account.currency) }));

  const claimedInflows = new Set<string>();

  for (const out of outflows) {
    const tolerance = Math.max(
      out.gbp * TRANSFER_PCT_TOLERANCE,
      TRANSFER_MIN_GBP_TOLERANCE,
    );
    let bestIdx = -1;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (let i = 0; i < inflows.length; i++) {
      const inFlow = inflows[i];
      if (inFlow.entry.accountId === out.entry.accountId) continue;
      const key = inflowKey(inFlow.entry);
      if (claimedInflows.has(key)) continue;
      const diff = Math.abs(inFlow.gbp - out.gbp);
      if (diff > tolerance) continue;
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) continue;

    const matched = inflows[bestIdx];
    claimedInflows.add(inflowKey(matched.entry));

    const outAcc = out.entry.account;
    const inAcc = matched.entry.account;
    warnings.push({
      code: "POSSIBLE_TRANSFER",
      severity: "info",
      accountId: outAcc.id,
      accountName: outAcc.name,
      accountOwner: outAcc.owner,
      accountCurrency: outAcc.currency,
      accountType: outAcc.type,
      month: out.entry.month,
      title: "Possible internal transfer",
      detail: `${formatCurrencyAmount(out.entry.cashOut, outAcc.currency)} left ${outAcc.name} (${outAcc.owner}) and ${formatCurrencyAmount(matched.entry.cashIn, inAcc.currency)} entered ${inAcc.name} (${inAcc.owner}) the same month. If this is a transfer between your own accounts, it shouldn't count as new income or spending.`,
      counterparty: {
        accountId: inAcc.id,
        accountName: inAcc.name,
        accountOwner: inAcc.owner,
        accountCurrency: inAcc.currency,
      },
    });
  }

  return warnings;
}

function inflowKey(entry: CheckEntry) {
  return `${entry.accountId}:${entry.month}`;
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

export function makeToGBP(
  fxRatesByMonth: FxRatesByMonth,
): (month: string, amount: number, currency: Currency) => number {
  return (month, amount, currency) => {
    if (currency === "GBP") return amount;
    const rates = fxRatesByMonth.get(month);
    const rate = rates?.[currency];
    if (!rate || rate === 0) return amount;
    return amount / rate;
  };
}

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

  const enriched: Array<CheckEntry & { account: CheckAccount }> = [];
  for (const entry of input.entries) {
    const account = accountById.get(entry.accountId);
    if (!account) continue;
    enriched.push({ ...entry, account });

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

  const toGBP = (amount: number, currency: Currency) => {
    if (currency === "GBP") return amount;
    const rate = input.fxRate?.[currency];
    if (!rate || rate === 0) return amount;
    return amount / rate;
  };
  warnings.push(...detectPossibleTransfers(enriched, toGBP));

  return warnings;
}

export function computeAllWarnings(
  entries: ReadonlyArray<CheckEntry>,
  accounts: ReadonlyArray<CheckAccount>,
  fxRatesByMonth: FxRatesByMonth,
): DataHealthWarning[] {
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const toGBP = makeToGBP(fxRatesByMonth);
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

  const entriesByMonth = new Map<string, Array<CheckEntry & { account: CheckAccount }>>();
  for (const entry of entries) {
    const account = accountById.get(entry.accountId);
    if (!account) continue;
    const arr = entriesByMonth.get(entry.month) ?? [];
    arr.push({ ...entry, account });
    entriesByMonth.set(entry.month, arr);
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

  for (const [month, monthEntries] of entriesByMonth) {
    const transferWarnings = detectPossibleTransfers(monthEntries, (amount, currency) =>
      toGBP(month, amount, currency),
    );
    warnings.push(...transferWarnings);
  }

  warnings.sort((a, b) => {
    if (a.month !== b.month) return b.month.localeCompare(a.month);
    if (a.severity !== b.severity) return a.severity === "warning" ? -1 : 1;
    return a.accountName.localeCompare(b.accountName);
  });

  return warnings;
}
