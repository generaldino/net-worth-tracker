import { tool } from "ai";
import { z } from "zod";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  financialAccounts as accountsTable,
  monthlyEntries,
  projectionScenarios,
} from "@/db/schema";
import { getAccessibleUserIds } from "@/app/actions/sharing";
import {
  getAccounts,
  getNetWorthBreakdown,
  getStaleAccounts,
} from "@/lib/actions";
import { convertCurrency, type Currency } from "@/lib/fx-rates-server";

export interface AssistantContext {
  displayCurrency: Currency;
}

interface Money {
  value: number;
  formatted: string;
}

function formatMoney(value: number, currency: Currency): Money {
  const rounded = Math.round(value * 100) / 100;
  return {
    value: rounded,
    formatted: new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(rounded),
  };
}

/** "2026-03" - N months → "YYYY-MM" */
function subtractMonth(month: string, offset: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Percent change from prev → curr, rounded to one decimal. Null if prev === 0. */
function percentChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Shared queries
// ---------------------------------------------------------------------------

interface MonthlyMetrics {
  month: string;
  income: Money;
  expenditure: Money;
  savings: Money;
  savingsRatePercent: number | null;
  incomeByAccount: Array<{ account: string; amount: Money }>;
  expenditureByAccount: Array<{ account: string; amount: Money }>;
}

async function computeMonthlyMetrics(
  month: string,
  displayCurrency: Currency,
): Promise<MonthlyMetrics | { month: string; error: string }> {
  const accessibleUserIds = await getAccessibleUserIds();
  if (accessibleUserIds.length === 0) {
    return { month, error: "No accessible data" };
  }

  const rows = await db
    .select({
      income: monthlyEntries.income,
      expenditure: monthlyEntries.expenditure,
      accountCurrency: accountsTable.currency,
      accountName: accountsTable.name,
    })
    .from(monthlyEntries)
    .innerJoin(accountsTable, eq(monthlyEntries.accountId, accountsTable.id))
    .where(
      and(
        inArray(accountsTable.userId, accessibleUserIds),
        eq(monthlyEntries.month, month),
      ),
    );

  if (rows.length === 0) {
    return { month, error: `No entries found for ${month}` };
  }

  let totalIncome = 0;
  let totalExpenditure = 0;
  const incomeByAccount: Array<{ account: string; amount: Money }> = [];
  const expenditureByAccount: Array<{ account: string; amount: Money }> = [];

  for (const row of rows) {
    const incomeNum = Number(row.income);
    const expNum = Number(row.expenditure);
    const nativeCurrency = row.accountCurrency as Currency;

    if (incomeNum > 0) {
      const converted = await convertCurrency(
        incomeNum,
        nativeCurrency,
        displayCurrency,
        month,
      );
      totalIncome += converted;
      incomeByAccount.push({
        account: row.accountName,
        amount: formatMoney(converted, displayCurrency),
      });
    }

    if (expNum > 0) {
      const converted = await convertCurrency(
        expNum,
        nativeCurrency,
        displayCurrency,
        month,
      );
      totalExpenditure += converted;
      expenditureByAccount.push({
        account: row.accountName,
        amount: formatMoney(converted, displayCurrency),
      });
    }
  }

  const savings = totalIncome - totalExpenditure;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : null;

  return {
    month,
    income: formatMoney(totalIncome, displayCurrency),
    expenditure: formatMoney(totalExpenditure, displayCurrency),
    savings: formatMoney(savings, displayCurrency),
    savingsRatePercent:
      savingsRate !== null ? Math.round(savingsRate * 10) / 10 : null,
    incomeByAccount,
    expenditureByAccount,
  };
}

/**
 * Net worth (already sign-adjusted for liabilities) for a single month,
 * converted to displayCurrency.
 */
async function computeNetWorthForMonth(
  month: string,
  accessibleUserIds: string[],
  displayCurrency: Currency,
): Promise<number> {
  const rows = await db
    .select({
      endingBalance: monthlyEntries.endingBalance,
      accountType: accountsTable.type,
      accountCurrency: accountsTable.currency,
    })
    .from(monthlyEntries)
    .innerJoin(accountsTable, eq(monthlyEntries.accountId, accountsTable.id))
    .where(
      and(
        inArray(accountsTable.userId, accessibleUserIds),
        eq(monthlyEntries.month, month),
      ),
    );

  let total = 0;
  for (const r of rows) {
    const converted = await convertCurrency(
      Number(r.endingBalance),
      r.accountCurrency as Currency,
      displayCurrency,
      month,
    );
    const isLiability =
      r.accountType === "Credit_Card" || r.accountType === "Loan";
    total += isLiability ? -Math.abs(converted) : converted;
  }
  return total;
}

/** Latest month that has any entries for the accessible user set. */
async function getLatestMonth(
  accessibleUserIds: string[],
): Promise<string | null> {
  if (accessibleUserIds.length === 0) return null;
  const [row] = await db
    .select({ month: monthlyEntries.month })
    .from(monthlyEntries)
    .innerJoin(accountsTable, eq(monthlyEntries.accountId, accountsTable.id))
    .where(inArray(accountsTable.userId, accessibleUserIds))
    .orderBy(desc(monthlyEntries.month))
    .limit(1);
  return row?.month ?? null;
}

// ---------------------------------------------------------------------------
// Build tools
// ---------------------------------------------------------------------------

export function buildTools(ctx: AssistantContext) {
  const { displayCurrency } = ctx;

  return {
    list_accounts: tool({
      description:
        "Lists the user's financial accounts with id, name, type, native currency, category, and whether they're closed. " +
        "Call this when you need to map an account name to an id, type, or currency. " +
        "Does not return any monetary amounts.",
      inputSchema: z.object({
        includeClosed: z
          .boolean()
          .default(false)
          .describe("If true, include accounts the user has marked as closed"),
      }),
      execute: async ({ includeClosed }) => {
        const accounts = await getAccounts(includeClosed);
        return {
          count: accounts.length,
          accounts: accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            category: a.category,
            nativeCurrency: a.currency,
            isClosed: a.isClosed,
          })),
        };
      },
    }),

    get_net_worth_summary: tool({
      description:
        "Returns the user's current net worth as of the most recent month, already converted to the session's display currency. " +
        "Includes total assets, total liabilities, counts of each, and the month-over-month change in net worth. " +
        "Monetary fields come back as { value, formatted } — quote `formatted` verbatim. " +
        "Use for 'what am I worth right now', 'how much did my net worth change since last month', and 'assets vs liabilities'.",
      inputSchema: z.object({}),
      execute: async () => {
        const accessibleUserIds = await getAccessibleUserIds();
        if (accessibleUserIds.length === 0) {
          return { error: "No accessible data" };
        }

        const { accountBalances, monthKey } = await getNetWorthBreakdown();

        let netWorthTotal = 0;
        let assetTotal = 0;
        let liabilityTotal = 0;
        let assetCount = 0;
        let liabilityCount = 0;

        for (const a of accountBalances) {
          const converted = await convertCurrency(
            a.balance,
            a.currency,
            displayCurrency,
            monthKey,
          );
          if (a.isLiability) {
            const abs = Math.abs(converted);
            netWorthTotal -= abs;
            liabilityTotal += abs;
            liabilityCount++;
          } else {
            netWorthTotal += converted;
            assetTotal += converted;
            assetCount++;
          }
        }

        // Month-over-month change
        const prevMonth = subtractMonth(monthKey, 1);
        const prevNetWorth = await computeNetWorthForMonth(
          prevMonth,
          accessibleUserIds,
          displayCurrency,
        );
        const delta = netWorthTotal - prevNetWorth;
        const pct = percentChange(netWorthTotal, prevNetWorth);

        return {
          asOfMonth: monthKey,
          netWorth: formatMoney(netWorthTotal, displayCurrency),
          totalAssets: formatMoney(assetTotal, displayCurrency),
          totalLiabilities: formatMoney(liabilityTotal, displayCurrency),
          assetCount,
          liabilityCount,
          monthOverMonthChange: {
            previousMonth: prevMonth,
            previousNetWorth: formatMoney(prevNetWorth, displayCurrency),
            delta: formatMoney(delta, displayCurrency),
            percentChange: pct,
          },
        };
      },
    }),

    get_monthly_metrics: tool({
      description:
        "Returns income, expenditure, savings, and savings rate for a single month, already converted to the session's display currency. " +
        "Also breaks down which accounts contributed to income and expenditure that month. " +
        "Monetary fields come back as { value, formatted } — quote `formatted` verbatim. " +
        "savingsRatePercent is a plain number (e.g. 12.3 means 12.3%). " +
        "Use this to answer questions about a specific month's performance.",
      inputSchema: z.object({
        month: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .describe("Month in YYYY-MM format, e.g. 2026-03"),
      }),
      execute: async ({ month }) =>
        computeMonthlyMetrics(month, displayCurrency),
    }),

    compare_months: tool({
      description:
        "Compares income, expenditure, savings, and savings rate between two months in a single call, already converted to the session's display currency. " +
        "Use this when the user asks 'how did X change between A and B'. " +
        "Prefer this over calling get_monthly_metrics twice. " +
        "Returns both months' metrics plus a diff object with absolute and percentage deltas. " +
        "Monetary fields are { value, formatted } — quote `formatted` verbatim.",
      inputSchema: z.object({
        monthA: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .describe("The later / more recent month, YYYY-MM"),
        monthB: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .describe("The earlier / baseline month, YYYY-MM"),
      }),
      execute: async ({ monthA, monthB }) => {
        const [a, b] = await Promise.all([
          computeMonthlyMetrics(monthA, displayCurrency),
          computeMonthlyMetrics(monthB, displayCurrency),
        ]);

        if ("error" in a || "error" in b) {
          return { monthA: a, monthB: b };
        }

        return {
          monthA: a,
          monthB: b,
          diff: {
            income: {
              delta: formatMoney(
                a.income.value - b.income.value,
                displayCurrency,
              ),
              percentChange: percentChange(a.income.value, b.income.value),
            },
            expenditure: {
              delta: formatMoney(
                a.expenditure.value - b.expenditure.value,
                displayCurrency,
              ),
              percentChange: percentChange(
                a.expenditure.value,
                b.expenditure.value,
              ),
            },
            savings: {
              delta: formatMoney(
                a.savings.value - b.savings.value,
                displayCurrency,
              ),
              percentChange: percentChange(a.savings.value, b.savings.value),
            },
            savingsRatePointChange:
              a.savingsRatePercent !== null && b.savingsRatePercent !== null
                ? Math.round(
                    (a.savingsRatePercent - b.savingsRatePercent) * 10,
                  ) / 10
                : null,
          },
        };
      },
    }),

    get_account_history: tool({
      description:
        "Returns the monthly balance history for a single account, already converted to the session's display currency. " +
        "Accepts either `accountId` (from list_accounts) or `accountName` (case-insensitive). " +
        "Includes income, expenditure, and cash flow for each month. " +
        "Use for questions about a single account's trajectory over time. " +
        "Monetary fields are { value, formatted } — quote `formatted` verbatim.",
      inputSchema: z.object({
        accountId: z
          .string()
          .uuid()
          .optional()
          .describe("Account UUID from list_accounts (either this OR accountName)"),
        accountName: z
          .string()
          .optional()
          .describe(
            "Case-insensitive account name (alternative to accountId; resolved server-side)",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(60)
          .default(12)
          .describe("How many most-recent months to return (default 12)"),
      }),
      execute: async ({ accountId, accountName, limit }) => {
        if (!accountId && !accountName) {
          return { error: "Provide accountId or accountName" };
        }

        const accessibleUserIds = await getAccessibleUserIds();
        if (accessibleUserIds.length === 0) {
          return { error: "No accessible data" };
        }

        // Resolve the account (enforce user scoping either way).
        let resolved;
        if (accountId) {
          const [row] = await db
            .select({
              id: accountsTable.id,
              name: accountsTable.name,
              type: accountsTable.type,
              currency: accountsTable.currency,
            })
            .from(accountsTable)
            .where(
              and(
                eq(accountsTable.id, accountId),
                inArray(accountsTable.userId, accessibleUserIds),
              ),
            )
            .limit(1);
          resolved = row;
        } else if (accountName) {
          const rows = await db
            .select({
              id: accountsTable.id,
              name: accountsTable.name,
              type: accountsTable.type,
              currency: accountsTable.currency,
            })
            .from(accountsTable)
            .where(inArray(accountsTable.userId, accessibleUserIds));
          const lower = accountName.toLowerCase();
          resolved = rows.find((r) => r.name.toLowerCase() === lower);
          if (!resolved) {
            // fall back to contains-match
            resolved = rows.find((r) => r.name.toLowerCase().includes(lower));
          }
        }

        if (!resolved) {
          return {
            error: `Account ${accountId ?? accountName} not found or not accessible`,
          };
        }

        const entries = await db
          .select()
          .from(monthlyEntries)
          .where(eq(monthlyEntries.accountId, resolved.id))
          .orderBy(desc(monthlyEntries.month))
          .limit(limit);

        const nativeCurrency = resolved.currency as Currency;
        const history = [];
        for (const e of entries) {
          const rawBalance = Number(e.endingBalance);
          const rawIncome = Number(e.income || 0);
          const rawExp = Number(e.expenditure || 0);

          const [balance, income, expenditure] = await Promise.all([
            convertCurrency(
              rawBalance,
              nativeCurrency,
              displayCurrency,
              e.month,
            ),
            rawIncome > 0
              ? convertCurrency(
                  rawIncome,
                  nativeCurrency,
                  displayCurrency,
                  e.month,
                )
              : Promise.resolve(0),
            rawExp > 0
              ? convertCurrency(
                  rawExp,
                  nativeCurrency,
                  displayCurrency,
                  e.month,
                )
              : Promise.resolve(0),
          ]);

          history.push({
            month: e.month,
            endingBalance: formatMoney(balance, displayCurrency),
            income: formatMoney(income, displayCurrency),
            expenditure: formatMoney(expenditure, displayCurrency),
          });
        }

        return {
          account: {
            id: resolved.id,
            name: resolved.name,
            type: resolved.type,
            nativeCurrency,
          },
          history, // newest first
        };
      },
    }),

    get_time_series: tool({
      description:
        "Returns net worth as a time series for the last N months, already converted to the session's display currency. " +
        "Each point is total net worth (assets minus liabilities). " +
        "Includes peak (month with highest net worth) and volatility (standard deviation of month-over-month percent changes). " +
        "Optionally pass `groupBy` to get a stacked series by account type or currency. " +
        "Monetary fields are { value, formatted } — quote `formatted` verbatim.",
      inputSchema: z.object({
        months: z
          .number()
          .int()
          .min(2)
          .max(60)
          .default(12)
          .describe("How many most-recent months to include"),
        groupBy: z
          .enum(["type", "currency"])
          .optional()
          .describe("Optional grouping for a stacked series"),
      }),
      execute: async ({ months, groupBy }) => {
        const accessibleUserIds = await getAccessibleUserIds();
        if (accessibleUserIds.length === 0) {
          return { error: "No accessible data" };
        }

        const latestMonth = await getLatestMonth(accessibleUserIds);
        if (!latestMonth) return { error: "No monthly entries" };

        const fromMonth = subtractMonth(latestMonth, months - 1);

        const rows = await db
          .select({
            month: monthlyEntries.month,
            endingBalance: monthlyEntries.endingBalance,
            accountType: accountsTable.type,
            accountCurrency: accountsTable.currency,
          })
          .from(monthlyEntries)
          .innerJoin(
            accountsTable,
            eq(monthlyEntries.accountId, accountsTable.id),
          )
          .where(
            and(
              inArray(accountsTable.userId, accessibleUserIds),
              gte(monthlyEntries.month, fromMonth),
            ),
          )
          .orderBy(asc(monthlyEntries.month));

        // Group rows by month, convert, apply liability sign, aggregate.
        const byMonth = new Map<
          string,
          Map<string, number> // group key → sum in displayCurrency
        >();
        const monthTotals = new Map<string, number>();

        for (const r of rows) {
          const isLiability =
            r.accountType === "Credit_Card" || r.accountType === "Loan";
          const converted = await convertCurrency(
            Number(r.endingBalance),
            r.accountCurrency as Currency,
            displayCurrency,
            r.month,
          );
          const signed = isLiability ? -Math.abs(converted) : converted;

          monthTotals.set(
            r.month,
            (monthTotals.get(r.month) ?? 0) + signed,
          );

          if (groupBy) {
            const key = groupBy === "type" ? r.accountType : r.accountCurrency;
            const monthMap = byMonth.get(r.month) ?? new Map<string, number>();
            monthMap.set(key, (monthMap.get(key) ?? 0) + signed);
            byMonth.set(r.month, monthMap);
          }
        }

        const sortedMonths = Array.from(monthTotals.keys()).sort();
        const series = sortedMonths.map((month) => {
          const total = monthTotals.get(month)!;
          const base = {
            month,
            total: formatMoney(total, displayCurrency),
          };
          if (!groupBy) return base;
          const groups = Array.from(byMonth.get(month) ?? []).map(
            ([key, value]) => ({
              key,
              amount: formatMoney(value, displayCurrency),
            }),
          );
          return { ...base, groups };
        });

        // Peak
        let peakMonth = sortedMonths[0];
        let peakValue = monthTotals.get(peakMonth) ?? 0;
        for (const m of sortedMonths) {
          const v = monthTotals.get(m)!;
          if (v > peakValue) {
            peakMonth = m;
            peakValue = v;
          }
        }

        // Volatility = stddev of MoM percent changes
        const pctChanges: number[] = [];
        for (let i = 1; i < sortedMonths.length; i++) {
          const prev = monthTotals.get(sortedMonths[i - 1])!;
          const curr = monthTotals.get(sortedMonths[i])!;
          if (prev !== 0) pctChanges.push((curr - prev) / Math.abs(prev));
        }
        const mean =
          pctChanges.length > 0
            ? pctChanges.reduce((a, b) => a + b, 0) / pctChanges.length
            : 0;
        const variance =
          pctChanges.length > 0
            ? pctChanges.reduce((a, b) => a + (b - mean) ** 2, 0) /
              pctChanges.length
            : 0;
        const volatilityPercent = Math.round(Math.sqrt(variance) * 1000) / 10;

        return {
          months: series.length,
          peak: { month: peakMonth, value: formatMoney(peakValue, displayCurrency) },
          volatilityPercent, // stddev of MoM % changes, e.g. 2.5 means ±2.5%
          series,
        };
      },
    }),

    get_net_worth_breakdown: tool({
      description:
        "Breaks down the user's current net worth by currency, account type, or account category, already converted to the session's display currency. " +
        "Use for questions like 'how much of my wealth is in GBP vs EUR', 'cash vs investments', 'pensions vs ISAs'. " +
        "Liabilities appear as negative amounts in their respective group. " +
        "Monetary fields are { value, formatted } — quote `formatted` verbatim.",
      inputSchema: z.object({
        groupBy: z
          .enum(["currency", "type", "category"])
          .describe(
            "How to group: 'currency' (GBP/EUR/USD/AED), 'type' (Current/Savings/Investment/etc.), or 'category' (Cash/Investments)",
          ),
      }),
      execute: async ({ groupBy }) => {
        const accessibleUserIds = await getAccessibleUserIds();
        if (accessibleUserIds.length === 0) {
          return { error: "No accessible data" };
        }

        const { accountBalances, monthKey } = await getNetWorthBreakdown();
        if (accountBalances.length === 0) {
          return { error: "No account balances" };
        }

        // Need type + category beyond what getNetWorthBreakdown returns.
        const accountMeta = await db
          .select({
            id: accountsTable.id,
            type: accountsTable.type,
            category: accountsTable.category,
          })
          .from(accountsTable)
          .where(inArray(accountsTable.userId, accessibleUserIds));

        const metaById = new Map(accountMeta.map((a) => [a.id, a]));

        const groups = new Map<
          string,
          { sum: number; accountCount: number }
        >();
        let total = 0;

        for (const a of accountBalances) {
          const converted = await convertCurrency(
            a.balance,
            a.currency,
            displayCurrency,
            monthKey,
          );
          const signed = a.isLiability ? -Math.abs(converted) : converted;

          let key: string;
          if (groupBy === "currency") key = a.currency;
          else if (groupBy === "type") key = metaById.get(a.accountId)?.type ?? "Unknown";
          else key = metaById.get(a.accountId)?.category ?? "Unknown";

          const entry = groups.get(key) ?? { sum: 0, accountCount: 0 };
          entry.sum += signed;
          entry.accountCount += 1;
          groups.set(key, entry);
          total += signed;
        }

        const groupsOut = Array.from(groups.entries())
          .map(([key, { sum, accountCount }]) => ({
            key,
            amount: formatMoney(sum, displayCurrency),
            percentOfTotal:
              total !== 0 ? Math.round((sum / total) * 1000) / 10 : null,
            accountCount,
          }))
          .sort((a, b) => Math.abs(b.amount.value) - Math.abs(a.amount.value));

        return {
          asOfMonth: monthKey,
          groupBy,
          total: formatMoney(total, displayCurrency),
          groups: groupsOut,
        };
      },
    }),

    get_account_rankings: tool({
      description:
        "Ranks accounts by a metric over a window — current balance, absolute growth, percent growth, or cash flow. " +
        "Amounts already converted to the session's display currency. " +
        "Use for 'which account grew fastest', 'biggest account', 'which lost the most'. " +
        "Monetary fields are { value, formatted } — quote `formatted` verbatim.",
      inputSchema: z.object({
        metric: z.enum([
          "current_balance",
          "absolute_growth",
          "percent_growth",
          "cash_flow",
        ]),
        windowMonths: z
          .number()
          .int()
          .min(1)
          .max(60)
          .default(12)
          .describe("For growth/cash_flow metrics, look back this many months"),
        limit: z.number().int().min(1).max(20).default(5),
        direction: z.enum(["top", "bottom"]).default("top"),
      }),
      execute: async ({ metric, windowMonths, limit, direction }) => {
        const accessibleUserIds = await getAccessibleUserIds();
        if (accessibleUserIds.length === 0) {
          return { error: "No accessible data" };
        }

        const latestMonth = await getLatestMonth(accessibleUserIds);
        if (!latestMonth) return { error: "No monthly entries" };

        const startMonth = subtractMonth(latestMonth, windowMonths);

        // Fetch all accounts + their latest entry and (optionally) start entry.
        const accounts = await db
          .select({
            id: accountsTable.id,
            name: accountsTable.name,
            type: accountsTable.type,
            currency: accountsTable.currency,
            isClosed: accountsTable.isClosed,
          })
          .from(accountsTable)
          .where(
            and(
              inArray(accountsTable.userId, accessibleUserIds),
              eq(accountsTable.isClosed, false),
            ),
          );

        const rankings: Array<{
          accountId: string;
          name: string;
          type: string;
          currentBalance: Money;
          startBalance: Money;
          absoluteChange: Money;
          percentChange: number | null;
          cashFlow: Money;
          metricValue: number;
        }> = [];

        for (const a of accounts) {
          // Latest entry for this account.
          const [latest] = await db
            .select()
            .from(monthlyEntries)
            .where(eq(monthlyEntries.accountId, a.id))
            .orderBy(desc(monthlyEntries.month))
            .limit(1);

          // Most recent entry whose month ≤ startMonth (the window's left edge).
          const [startAtOrBefore] = await db
            .select()
            .from(monthlyEntries)
            .where(
              and(
                eq(monthlyEntries.accountId, a.id),
                lte(monthlyEntries.month, startMonth),
              ),
            )
            .orderBy(desc(monthlyEntries.month))
            .limit(1);

          // If the account's history starts after the window, fall back to its
          // earliest entry — the account is too new to have a baseline.
          const [earliest] = await db
            .select()
            .from(monthlyEntries)
            .where(eq(monthlyEntries.accountId, a.id))
            .orderBy(asc(monthlyEntries.month))
            .limit(1);

          const startRow = startAtOrBefore ?? earliest;

          const native = a.currency as Currency;
          const currentRaw = latest ? Number(latest.endingBalance) : 0;
          const startRaw = startRow ? Number(startRow.endingBalance) : 0;
          const currentConverted = latest
            ? await convertCurrency(currentRaw, native, displayCurrency, latest.month)
            : 0;
          const startConverted = startRow
            ? await convertCurrency(
                startRaw,
                native,
                displayCurrency,
                startRow.month,
              )
            : 0;

          // Cash flow over window: sum (cashIn - cashOut) across entries in range
          const flowRows = await db
            .select({
              cashIn: monthlyEntries.cashIn,
              cashOut: monthlyEntries.cashOut,
              month: monthlyEntries.month,
            })
            .from(monthlyEntries)
            .where(
              and(
                eq(monthlyEntries.accountId, a.id),
                gte(monthlyEntries.month, startMonth),
              ),
            );

          let flowTotal = 0;
          for (const f of flowRows) {
            const net = Number(f.cashIn) - Number(f.cashOut);
            flowTotal += await convertCurrency(
              net,
              native,
              displayCurrency,
              f.month,
            );
          }

          const absChange = currentConverted - startConverted;
          const pct = percentChange(currentConverted, startConverted);

          let metricValue: number;
          switch (metric) {
            case "current_balance":
              metricValue = currentConverted;
              break;
            case "absolute_growth":
              metricValue = absChange;
              break;
            case "percent_growth":
              metricValue = pct ?? -Infinity;
              break;
            case "cash_flow":
              metricValue = flowTotal;
              break;
          }

          rankings.push({
            accountId: a.id,
            name: a.name,
            type: a.type,
            currentBalance: formatMoney(currentConverted, displayCurrency),
            startBalance: formatMoney(startConverted, displayCurrency),
            absoluteChange: formatMoney(absChange, displayCurrency),
            percentChange: pct,
            cashFlow: formatMoney(flowTotal, displayCurrency),
            metricValue,
          });
        }

        rankings.sort((a, b) =>
          direction === "top"
            ? b.metricValue - a.metricValue
            : a.metricValue - b.metricValue,
        );

        return {
          metric,
          windowMonths,
          direction,
          fromMonth: startMonth,
          toMonth: latestMonth,
          // Strip metricValue from output — it's only for sorting
          rankings: rankings.slice(0, limit).map(({ metricValue, ...rest }) => {
            void metricValue;
            return rest;
          }),
        };
      },
    }),

    get_metrics_window: tool({
      description:
        "Aggregates income, expenditure, savings, and savings rate across the last N months. " +
        "Returns totals, monthly averages, best/worst month for savings, and the per-month series. " +
        "Amounts already converted to the session's display currency. " +
        "Use for 'average savings rate this year', 'best month for savings', 'total income in the last 6 months'. " +
        "Monetary fields are { value, formatted } — quote `formatted` verbatim.",
      inputSchema: z.object({
        months: z
          .number()
          .int()
          .min(2)
          .max(60)
          .default(12)
          .describe("How many most-recent months to aggregate"),
      }),
      execute: async ({ months }) => {
        const accessibleUserIds = await getAccessibleUserIds();
        if (accessibleUserIds.length === 0) {
          return { error: "No accessible data" };
        }

        const latestMonth = await getLatestMonth(accessibleUserIds);
        if (!latestMonth) return { error: "No monthly entries" };

        // Walk back N months, compute metrics for each.
        const monthList: string[] = [];
        for (let i = months - 1; i >= 0; i--) {
          monthList.push(subtractMonth(latestMonth, i));
        }

        const perMonth = await Promise.all(
          monthList.map((m) => computeMonthlyMetrics(m, displayCurrency)),
        );

        const valid = perMonth.filter(
          (r): r is MonthlyMetrics => !("error" in r),
        );
        if (valid.length === 0) {
          return { error: "No monthly data in window" };
        }

        let sumIncome = 0;
        let sumExp = 0;
        let sumSavings = 0;
        let best = valid[0];
        let worst = valid[0];

        for (const m of valid) {
          sumIncome += m.income.value;
          sumExp += m.expenditure.value;
          sumSavings += m.savings.value;
          if (m.savings.value > best.savings.value) best = m;
          if (m.savings.value < worst.savings.value) worst = m;
        }

        const avgIncome = sumIncome / valid.length;
        const avgExp = sumExp / valid.length;
        const avgSavings = sumSavings / valid.length;
        const avgSavingsRate =
          sumIncome > 0 ? (sumSavings / sumIncome) * 100 : null;

        return {
          months: valid.length,
          fromMonth: valid[0].month,
          toMonth: valid[valid.length - 1].month,
          totals: {
            income: formatMoney(sumIncome, displayCurrency),
            expenditure: formatMoney(sumExp, displayCurrency),
            savings: formatMoney(sumSavings, displayCurrency),
          },
          averages: {
            income: formatMoney(avgIncome, displayCurrency),
            expenditure: formatMoney(avgExp, displayCurrency),
            savings: formatMoney(avgSavings, displayCurrency),
            savingsRatePercent:
              avgSavingsRate !== null
                ? Math.round(avgSavingsRate * 10) / 10
                : null,
          },
          best: {
            month: best.month,
            savings: best.savings,
            savingsRatePercent: best.savingsRatePercent,
          },
          worst: {
            month: worst.month,
            savings: worst.savings,
            savingsRatePercent: worst.savingsRatePercent,
          },
          series: valid.slice(-24).map((m) => ({
            month: m.month,
            income: m.income,
            expenditure: m.expenditure,
            savings: m.savings,
            savingsRatePercent: m.savingsRatePercent,
          })),
        };
      },
    }),

    find_milestone: tool({
      description:
        "Finds the first month the user's net worth, monthly savings, or monthly income crossed a threshold (above or below). " +
        "Use for 'when did my net worth first hit £500k', 'when did I first save £10k in a month'. " +
        "The threshold is interpreted in the session's display currency. " +
        "Returns { found, month, valueAtMonth } — valueAtMonth is { value, formatted }.",
      inputSchema: z.object({
        metric: z.enum(["net_worth", "monthly_savings", "monthly_income"]),
        threshold: z
          .number()
          .describe(
            "Amount in the session's display currency (e.g. 500000 for £500k)",
          ),
        direction: z.enum(["first_above", "first_below"]).default("first_above"),
      }),
      execute: async ({ metric, threshold, direction }) => {
        const accessibleUserIds = await getAccessibleUserIds();
        if (accessibleUserIds.length === 0) {
          return { error: "No accessible data" };
        }

        // Gather monthly values for the requested metric, oldest first.
        const months: string[] = [];
        const allMonths = await db
          .select({ month: monthlyEntries.month })
          .from(monthlyEntries)
          .innerJoin(
            accountsTable,
            eq(monthlyEntries.accountId, accountsTable.id),
          )
          .where(inArray(accountsTable.userId, accessibleUserIds))
          .groupBy(monthlyEntries.month)
          .orderBy(asc(monthlyEntries.month));

        for (const r of allMonths) months.push(r.month);

        for (const month of months) {
          let value: number;
          if (metric === "net_worth") {
            value = await computeNetWorthForMonth(
              month,
              accessibleUserIds,
              displayCurrency,
            );
          } else {
            const m = await computeMonthlyMetrics(month, displayCurrency);
            if ("error" in m) continue;
            value =
              metric === "monthly_savings" ? m.savings.value : m.income.value;
          }

          const crossed =
            direction === "first_above"
              ? value >= threshold
              : value <= threshold;
          if (crossed) {
            return {
              found: true,
              month,
              valueAtMonth: formatMoney(value, displayCurrency),
              metric,
              threshold,
              direction,
            };
          }
        }

        return {
          found: false,
          month: null,
          valueAtMonth: null,
          metric,
          threshold,
          direction,
        };
      },
    }),

    get_liquidity_snapshot: tool({
      description:
        "Bucketed view of current net worth: liquid (Current + Savings), investable (Investment + Stock + Crypto + Commodity), locked (Pension + Stock_options + Asset), short-term debt (Credit_Card), long-term debt (Loan). " +
        "Amounts already converted to the session's display currency. " +
        "Use for 'how much could I access this month', 'how much credit-card debt am I carrying', 'liquid vs locked'. " +
        "Monetary fields are { value, formatted } — quote `formatted` verbatim.",
      inputSchema: z.object({}),
      execute: async () => {
        const accessibleUserIds = await getAccessibleUserIds();
        if (accessibleUserIds.length === 0) {
          return { error: "No accessible data" };
        }

        const { accountBalances, monthKey } = await getNetWorthBreakdown();
        if (accountBalances.length === 0) {
          return { error: "No account balances" };
        }

        const meta = await db
          .select({
            id: accountsTable.id,
            type: accountsTable.type,
          })
          .from(accountsTable)
          .where(inArray(accountsTable.userId, accessibleUserIds));
        const typeById = new Map(meta.map((a) => [a.id, a.type]));

        let liquid = 0;
        let investable = 0;
        let locked = 0;
        let shortTermDebt = 0;
        let longTermDebt = 0;

        for (const a of accountBalances) {
          const converted = await convertCurrency(
            a.balance,
            a.currency,
            displayCurrency,
            monthKey,
          );
          const type = typeById.get(a.accountId);

          switch (type) {
            case "Current":
            case "Savings":
              liquid += converted;
              break;
            case "Investment":
            case "Stock":
            case "Crypto":
            case "Commodity":
              investable += converted;
              break;
            case "Pension":
            case "Stock_options":
            case "Asset":
              locked += converted;
              break;
            case "Credit_Card":
              shortTermDebt += Math.abs(converted);
              break;
            case "Loan":
              longTermDebt += Math.abs(converted);
              break;
          }
        }

        return {
          asOfMonth: monthKey,
          liquid: formatMoney(liquid, displayCurrency),
          investable: formatMoney(investable, displayCurrency),
          locked: formatMoney(locked, displayCurrency),
          shortTermDebt: formatMoney(shortTermDebt, displayCurrency),
          longTermDebt: formatMoney(longTermDebt, displayCurrency),
          netWorth: formatMoney(
            liquid + investable + locked - shortTermDebt - longTermDebt,
            displayCurrency,
          ),
        };
      },
    }),

    get_stale_accounts: tool({
      description:
        "Returns accounts that are missing recent monthly entries — useful for 'which accounts haven't I updated'. " +
        "Aggregates to one row per account with `monthsBehind` (how many missing months of data since that account's history began).",
      inputSchema: z.object({}),
      execute: async () => {
        const stale = await getStaleAccounts();

        // Aggregate staleEntries → one row per account.
        const byAccount = new Map<
          string,
          {
            accountId: string;
            name: string;
            type: string;
            lastKnownMonth: string | null;
            monthsBehind: number;
          }
        >();

        for (const e of stale.staleEntries) {
          const existing = byAccount.get(e.account.id);
          if (!existing) {
            byAccount.set(e.account.id, {
              accountId: e.account.id,
              name: e.account.name,
              type: e.account.type,
              lastKnownMonth: e.previousMonth,
              monthsBehind: 1,
            });
          } else {
            existing.monthsBehind += 1;
            // Track latest last-known month
            if (
              e.previousMonth &&
              (!existing.lastKnownMonth ||
                e.previousMonth > existing.lastKnownMonth)
            ) {
              existing.lastKnownMonth = e.previousMonth;
            }
          }
        }

        const accounts = Array.from(byAccount.values()).sort(
          (a, b) => b.monthsBehind - a.monthsBehind,
        );

        return {
          staleAccountCount: accounts.length,
          missingMonthCount: stale.missingMonthCount,
          accounts: accounts.slice(0, 20),
        };
      },
    }),

    list_projection_scenarios: tool({
      description:
        "Lists the user's saved projection scenarios (hypothetical future-planning models they've created in the UI). " +
        "Returns name, target savings rate, assumed monthly income, time horizon, and growth assumptions. " +
        "Use for 'what projection scenarios do I have'. " +
        "Note: this app does not currently generate forecasts — it only reports what scenarios exist. " +
        "Do NOT use this to answer 'when will I hit £X' type questions.",
      inputSchema: z.object({}),
      execute: async () => {
        const accessibleUserIds = await getAccessibleUserIds();
        if (accessibleUserIds.length === 0) {
          return { scenarios: [] };
        }

        const scenarios = await db
          .select()
          .from(projectionScenarios)
          .where(inArray(projectionScenarios.userId, accessibleUserIds));

        if (scenarios.length === 0) {
          return {
            scenarios: [],
            message:
              "No projection scenarios have been created yet. The user can create them in the projection UI.",
          };
        }

        return {
          scenarios: scenarios.map((s) => ({
            id: s.id,
            name: s.name,
            monthlyIncome: formatMoney(
              Number(s.monthlyIncome),
              displayCurrency,
            ),
            savingsRatePercent: Number(s.savingsRate),
            timePeriodMonths: s.timePeriodMonths,
            growthRates: s.growthRates,
            savingsAllocation: s.savingsAllocation,
          })),
        };
      },
    }),
  };
}
