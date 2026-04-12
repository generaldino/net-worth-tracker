import { tool } from "ai";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
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
      execute: async ({ month }) => {
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
          .innerJoin(
            accountsTable,
            eq(monthlyEntries.accountId, accountsTable.id),
          )
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
        const expenditureByAccount: Array<{ account: string; amount: Money }> =
          [];

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
        const savingsRate =
          totalIncome > 0 ? (savings / totalIncome) * 100 : null;

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
      },
    }),
  };
}
