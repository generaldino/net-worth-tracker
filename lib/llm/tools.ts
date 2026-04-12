import { tool } from "ai";
import { z } from "zod";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  financialAccounts as accountsTable,
  monthlyEntries,
} from "@/db/schema";
import { getAccessibleUserIds } from "@/app/actions/sharing";
import { getAccounts, getNetWorthBreakdown } from "@/lib/actions";
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
 * Subtract previous-month month string from an offset. "2026-03" - 1 → "2026-02".
 */
function subtractMonth(month: string, offset: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildTools(ctx: AssistantContext) {
  const { displayCurrency } = ctx;

  return {
    list_accounts: tool({
      description:
        "Lists the user's financial accounts with id, name, type, native currency, category, and whether they're closed. " +
        "Call this first when you need to know what accounts exist before drilling into a specific one. " +
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
        `Returns the user's current net worth as of the most recent month, fully converted to ${displayCurrency}. ` +
        "Also returns the total assets, total liabilities, and counts of each. " +
        "Monetary fields come back as { value, formatted } — quote the `formatted` string verbatim in your answer. " +
        "Use this to answer questions like 'what am I worth right now' or 'how much of my wealth is in assets vs liabilities'.",
      inputSchema: z.object({}),
      execute: async () => {
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

        return {
          asOfMonth: monthKey,
          netWorth: formatMoney(netWorthTotal, displayCurrency),
          totalAssets: formatMoney(assetTotal, displayCurrency),
          totalLiabilities: formatMoney(liabilityTotal, displayCurrency),
          assetCount,
          liabilityCount,
        };
      },
    }),

    get_monthly_metrics: tool({
      description:
        `Returns income, expenditure, savings, and savings rate for a single month, all converted to ${displayCurrency}. ` +
        "Also breaks down which accounts contributed to income and expenditure that month. " +
        "Monetary fields come back as { value, formatted } — quote the `formatted` string verbatim. " +
        "savingsRatePercent is a plain number (e.g. 12.3 means 12.3%). " +
        "Use this to answer questions about a specific month's performance, like 'why did I only save X% in March'.",
      inputSchema: z.object({
        month: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .describe("Month in YYYY-MM format, e.g. 2026-03"),
      }),
      execute: async ({ month }) => computeMonthlyMetrics(month, displayCurrency),
    }),

    compare_months: tool({
      description:
        "Compares income, expenditure, savings, and savings rate between two months in a single call. " +
        "Use this when the user asks 'how did X change between A and B' or 'why is X different this month vs last month'. " +
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

        const pct = (curr: number, prev: number): number | null =>
          prev === 0 ? null : Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;

        return {
          monthA: a,
          monthB: b,
          diff: {
            income: {
              delta: formatMoney(a.income.value - b.income.value, displayCurrency),
              percentChange: pct(a.income.value, b.income.value),
            },
            expenditure: {
              delta: formatMoney(
                a.expenditure.value - b.expenditure.value,
                displayCurrency,
              ),
              percentChange: pct(a.expenditure.value, b.expenditure.value),
            },
            savings: {
              delta: formatMoney(
                a.savings.value - b.savings.value,
                displayCurrency,
              ),
              percentChange: pct(a.savings.value, b.savings.value),
            },
            savingsRatePointChange:
              a.savingsRatePercent !== null && b.savingsRatePercent !== null
                ? Math.round((a.savingsRatePercent - b.savingsRatePercent) * 10) /
                  10
                : null,
          },
        };
      },
    }),

    get_account_history: tool({
      description:
        `Returns the monthly balance history for a specific account, converted to ${displayCurrency}. ` +
        "Also includes income, expenditure, and cash flow for each month. " +
        "Call list_accounts first to look up the accountId. " +
        "Use this for questions about a single account's trajectory over time, like 'how has my ISA grown this year'. " +
        "Monetary fields are { value, formatted } — quote `formatted` verbatim.",
      inputSchema: z.object({
        accountId: z.string().uuid().describe("Account UUID from list_accounts"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(60)
          .default(12)
          .describe("How many most-recent months to return (default 12)"),
      }),
      execute: async ({ accountId, limit }) => {
        const accessibleUserIds = await getAccessibleUserIds();
        if (accessibleUserIds.length === 0) {
          return { error: "No accessible data" };
        }

        // Verify the account belongs to an accessible user before reading.
        const [account] = await db
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

        if (!account) {
          return { error: `Account ${accountId} not found or not accessible` };
        }

        const entries = await db
          .select()
          .from(monthlyEntries)
          .where(eq(monthlyEntries.accountId, accountId))
          .orderBy(desc(monthlyEntries.month))
          .limit(limit);

        const nativeCurrency = account.currency as Currency;
        const history = [];
        for (const e of entries) {
          const rawBalance = Number(e.endingBalance);
          const rawIncome = Number(e.income || 0);
          const rawExp = Number(e.expenditure || 0);

          const [balance, income, expenditure] = await Promise.all([
            convertCurrency(rawBalance, nativeCurrency, displayCurrency, e.month),
            rawIncome > 0
              ? convertCurrency(rawIncome, nativeCurrency, displayCurrency, e.month)
              : Promise.resolve(0),
            rawExp > 0
              ? convertCurrency(rawExp, nativeCurrency, displayCurrency, e.month)
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
            id: account.id,
            name: account.name,
            type: account.type,
            nativeCurrency,
          },
          history, // newest first
        };
      },
    }),

    get_time_series: tool({
      description:
        `Returns net worth as a time series for the last N months, fully converted to ${displayCurrency}. ` +
        "Each point is one month's total net worth (assets minus liabilities). " +
        "Use this for trend questions like 'how has my net worth changed over the past year' or 'when did my net worth peak'. " +
        "Monetary fields are { value, formatted } — quote `formatted` verbatim.",
      inputSchema: z.object({
        months: z
          .number()
          .int()
          .min(2)
          .max(60)
          .default(12)
          .describe("How many most-recent months to include (default 12)"),
      }),
      execute: async ({ months }) => {
        const accessibleUserIds = await getAccessibleUserIds();
        if (accessibleUserIds.length === 0) {
          return { error: "No accessible data" };
        }

        // Find the earliest month we care about by walking N months back from
        // the latest entry the user has. Using the actual latest month rather
        // than "today" avoids empty-series issues if the user is behind on
        // entries.
        const [latestRow] = await db
          .select({ month: monthlyEntries.month })
          .from(monthlyEntries)
          .innerJoin(
            accountsTable,
            eq(monthlyEntries.accountId, accountsTable.id),
          )
          .where(inArray(accountsTable.userId, accessibleUserIds))
          .orderBy(desc(monthlyEntries.month))
          .limit(1);

        if (!latestRow) {
          return { error: "No monthly entries" };
        }

        const fromMonth = subtractMonth(latestRow.month, months - 1);

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

        // Group rows by month, convert per-row to displayCurrency using that
        // month's FX rate, apply asset/liability sign, sum.
        const byMonth = new Map<
          string,
          Array<{ balance: number; isLiability: boolean; currency: Currency }>
        >();
        for (const r of rows) {
          const isLiability =
            r.accountType === "Credit_Card" || r.accountType === "Loan";
          const arr = byMonth.get(r.month) ?? [];
          arr.push({
            balance: Number(r.endingBalance),
            isLiability,
            currency: r.accountCurrency as Currency,
          });
          byMonth.set(r.month, arr);
        }

        const series: Array<{ month: string; netWorth: Money }> = [];
        const sortedMonths = Array.from(byMonth.keys()).sort();
        for (const month of sortedMonths) {
          let total = 0;
          for (const entry of byMonth.get(month)!) {
            const converted = await convertCurrency(
              entry.balance,
              entry.currency,
              displayCurrency,
              month,
            );
            total += entry.isLiability ? -Math.abs(converted) : converted;
          }
          series.push({ month, netWorth: formatMoney(total, displayCurrency) });
        }

        return { months: series.length, series };
      },
    }),
  };
}
