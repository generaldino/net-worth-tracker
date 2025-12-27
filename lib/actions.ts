"use server";

import { db } from "@/db";
import {
  accounts as accountsTable,
  monthlyEntries,
  projectionScenarios,
} from "@/db/schema";
import { desc, asc, eq, and, inArray } from "drizzle-orm";
import type { Account, MonthlyEntry } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/auth-helpers";
import { getAccessibleUserIds } from "@/app/actions/sharing";
import type { Currency } from "@/lib/fx-rates";
import type { AccountType } from "@/lib/types";
import { fetchAndSaveExchangeRatesForMonth } from "@/lib/fx-rates-server";

export async function calculateNetWorth() {
  try {
    const accessibleUserIds = await getAccessibleUserIds();
    if (accessibleUserIds.length === 0) {
      return 0;
    }

    // Get accounts for accessible users
    const allAccounts = await db
      .select()
      .from(accountsTable)
      .where(inArray(accountsTable.userId, accessibleUserIds));

    // Get accessible account IDs
    const accessibleAccountIds = allAccounts.map((acc) => acc.id);

    if (accessibleAccountIds.length === 0) {
      return 0;
    }

    // Get the latest monthly entries for accessible accounts
    const latestEntries = await db
      .select()
      .from(monthlyEntries)
      .where(inArray(monthlyEntries.accountId, accessibleAccountIds))
      .orderBy(desc(monthlyEntries.month));

    // Calculate total net worth from the latest entries
    // Credit cards are liabilities, so subtract their balances
    const netWorth = allAccounts.reduce((total: number, account: Account) => {
      const latestEntry = latestEntries.find(
        (entry: MonthlyEntry) => entry.accountId === account.id
      );
      const balance = Number(latestEntry?.endingBalance || 0);

      // Credit cards and loans are liabilities - subtract from net worth
      if (account.type === "Credit_Card" || account.type === "Loan") {
        return total - balance;
      }

      // All other accounts are assets - add to net worth
      return total + balance;
    }, 0);

    return netWorth;
  } catch (error) {
    console.error("Error calculating net worth:", error);
    return 0;
  }
}

export async function getNetWorthBreakdown() {
  try {
    const accessibleUserIds = await getAccessibleUserIds();
    if (accessibleUserIds.length === 0) {
      return {
        accountBalances: [],
        monthKey: new Date().toISOString().substring(0, 7),
      };
    }

    // Get accounts for accessible users
    const allAccounts = await db
      .select()
      .from(accountsTable)
      .where(inArray(accountsTable.userId, accessibleUserIds));

    // Get accessible account IDs
    const accessibleAccountIds = allAccounts.map((acc) => acc.id);

    if (accessibleAccountIds.length === 0) {
      return {
        accountBalances: [],
        monthKey: new Date().toISOString().substring(0, 7),
      };
    }

    // Get the latest monthly entries for accessible accounts
    const latestEntries = await db
      .select()
      .from(monthlyEntries)
      .where(inArray(monthlyEntries.accountId, accessibleAccountIds))
      .orderBy(desc(monthlyEntries.month));

    // Get the latest month for rate conversion
    const latestMonth =
      latestEntries.length > 0 ? latestEntries[0].month : null;

    // Calculate net worth breakdown with currency info
    const accountBalances = allAccounts.map((account: Account) => {
      const latestEntry = latestEntries.find(
        (entry: MonthlyEntry) => entry.accountId === account.id
      );
      const balance = Number(latestEntry?.endingBalance || 0);

      return {
        accountId: account.id,
        balance,
        currency: (account.currency || "GBP") as Currency,
        isLiability: account.type === "Credit_Card" || account.type === "Loan",
      };
    });

    return {
      accountBalances,
      monthKey: latestMonth || new Date().toISOString().substring(0, 7), // YYYY-MM format
    };
  } catch (error) {
    console.error("Error getting net worth breakdown:", error);
    return {
      accountBalances: [],
      monthKey: new Date().toISOString().substring(0, 7),
    };
  }
}

export async function getFirstEntryNetWorth() {
  try {
    const accessibleUserIds = await getAccessibleUserIds();
    if (accessibleUserIds.length === 0) {
      return null;
    }

    // Get accounts for accessible users
    const allAccounts = await db
      .select()
      .from(accountsTable)
      .where(inArray(accountsTable.userId, accessibleUserIds));

    // Get accessible account IDs
    const accessibleAccountIds = allAccounts.map((acc) => acc.id);

    if (accessibleAccountIds.length === 0) {
      return null;
    }

    // Get all monthly entries for accessible accounts ordered by month
    const allEntries = await db
      .select()
      .from(monthlyEntries)
      .where(inArray(monthlyEntries.accountId, accessibleAccountIds))
      .orderBy(asc(monthlyEntries.month));

    if (allEntries.length === 0) {
      return null;
    }

    // Get the earliest month
    const earliestMonth = allEntries[0].month;

    // Get all entries for the earliest month
    const firstMonthEntries = allEntries.filter(
      (entry) => entry.month === earliestMonth
    );

    // Calculate net worth for the first entry month
    const firstNetWorth = allAccounts.reduce(
      (total: number, account: Account) => {
        // Find the entry for this account in the earliest month
        const entryForAccount = firstMonthEntries.find(
          (entry: MonthlyEntry) => entry.accountId === account.id
        );
        const balance = Number(entryForAccount?.endingBalance || 0);

        // Credit cards and loans are liabilities - subtract from net worth
        if (account.type === "Credit_Card" || account.type === "Loan") {
          return total - balance;
        }

        // All other accounts are assets - add to net worth
        return total + balance;
      },
      0
    );

    return {
      netWorth: firstNetWorth,
      month: earliestMonth,
    };
  } catch (error) {
    console.error("Error getting first entry net worth:", error);
    return null;
  }
}

export async function getFinancialMetrics() {
  try {
    const accessibleUserIds = await getAccessibleUserIds();
    if (accessibleUserIds.length === 0) {
      return {
        netWorthYTD: 0,
        netWorthAllTime: 0,
        netWorthPercentageYTD: null,
        netWorthPercentageAllTime: null,
        incomeYTD: 0,
        incomeAllTime: 0,
        incomePercentageYTD: null,
        incomePercentageAllTime: null,
        expenditureYTD: 0,
        expenditureAllTime: 0,
        expenditurePercentageYTD: null,
        expenditurePercentageAllTime: null,
        savingsYTD: 0,
        savingsAllTime: 0,
        savingsPercentageYTD: null,
        savingsPercentageAllTime: null,
        savingsRateYTD: null,
        savingsRateAllTime: null,
        spendingRateYTD: null,
        spendingRateAllTime: null,
        incomeBreakdownYTD: [],
        incomeBreakdownAllTime: [],
        expenditureBreakdownYTD: [],
        expenditureBreakdownAllTime: [],
        latestMonth: null,
      };
    }

    // Get accounts for accessible users
    const allAccounts = await db
      .select()
      .from(accountsTable)
      .where(inArray(accountsTable.userId, accessibleUserIds));

    const accessibleAccountIds = allAccounts.map((acc) => acc.id);

    if (accessibleAccountIds.length === 0) {
      return {
        netWorthYTD: 0,
        netWorthAllTime: 0,
        netWorthPercentageYTD: null,
        netWorthPercentageAllTime: null,
        incomeYTD: 0,
        incomeAllTime: 0,
        incomePercentageYTD: null,
        incomePercentageAllTime: null,
        expenditureYTD: 0,
        expenditureAllTime: 0,
        expenditurePercentageYTD: null,
        expenditurePercentageAllTime: null,
        savingsYTD: 0,
        savingsAllTime: 0,
        savingsPercentageYTD: null,
        savingsPercentageAllTime: null,
        savingsRateYTD: null,
        savingsRateAllTime: null,
        spendingRateYTD: null,
        spendingRateAllTime: null,
        incomeBreakdownYTD: [],
        incomeBreakdownAllTime: [],
        expenditureBreakdownYTD: [],
        expenditureBreakdownAllTime: [],
        latestMonth: null,
      };
    }

    // Get all monthly entries with account info
    const entries = await db
      .select({
        month: monthlyEntries.month,
        accountId: monthlyEntries.accountId,
        income: monthlyEntries.income,
        expenditure: monthlyEntries.expenditure,
        endingBalance: monthlyEntries.endingBalance,
        accountType: accountsTable.type,
        accountCurrency: accountsTable.currency,
      })
      .from(monthlyEntries)
      .innerJoin(accountsTable, eq(monthlyEntries.accountId, accountsTable.id))
      .where(inArray(monthlyEntries.accountId, accessibleAccountIds))
      .orderBy(desc(monthlyEntries.month));

    if (entries.length === 0) {
      return {
        netWorthYTD: 0,
        netWorthAllTime: 0,
        netWorthPercentageYTD: null,
        netWorthPercentageAllTime: null,
        incomeYTD: 0,
        incomeAllTime: 0,
        incomePercentageYTD: null,
        incomePercentageAllTime: null,
        expenditureYTD: 0,
        expenditureAllTime: 0,
        expenditurePercentageYTD: null,
        expenditurePercentageAllTime: null,
        savingsYTD: 0,
        savingsAllTime: 0,
        savingsPercentageYTD: null,
        savingsPercentageAllTime: null,
        savingsRateYTD: null,
        savingsRateAllTime: null,
        spendingRateYTD: null,
        spendingRateAllTime: null,
        incomeBreakdownYTD: [],
        incomeBreakdownAllTime: [],
        expenditureBreakdownYTD: [],
        expenditureBreakdownAllTime: [],
        latestMonth: null,
      };
    }

    // Get latest month for YTD calculation
    const latestMonth = entries[0].month;
    const currentYear = latestMonth.substring(0, 4); // YYYY-MM format

    // Track income and expenditure by currency
    const incomeBreakdownYTD: Array<{ currency: Currency; amount: number }> =
      [];
    const incomeBreakdownAllTime: Array<{
      currency: Currency;
      amount: number;
    }> = [];
    const expenditureBreakdownYTD: Array<{
      currency: Currency;
      amount: number;
    }> = [];
    const expenditureBreakdownAllTime: Array<{
      currency: Currency;
      amount: number;
    }> = [];

    const incomeByCurrencyYTD = new Map<Currency, number>();
    const incomeByCurrencyAllTime = new Map<Currency, number>();
    const expenditureByCurrencyYTD = new Map<Currency, number>();
    const expenditureByCurrencyAllTime = new Map<Currency, number>();

    // Get latest month entries for net worth calculation
    const latestMonthEntries = entries.filter(
      (entry) => entry.month === latestMonth
    );

    entries.forEach((entry) => {
      const currency = (entry.accountCurrency || "GBP") as Currency;
      const income = Number(entry.income || 0);
      const expenditure = Number(entry.expenditure || 0);
      const isYTDMonth = entry.month.startsWith(currentYear);

      // Income from Current accounts only
      if (entry.accountType === "Current") {
        if (isYTDMonth) {
          const current = incomeByCurrencyYTD.get(currency) || 0;
          incomeByCurrencyYTD.set(currency, current + income);
        }
        const current = incomeByCurrencyAllTime.get(currency) || 0;
        incomeByCurrencyAllTime.set(currency, current + income);
      }

      // Expenditure from Current and Credit_Card accounts
      if (
        entry.accountType === "Current" ||
        entry.accountType === "Credit_Card"
      ) {
        if (isYTDMonth) {
          const current = expenditureByCurrencyYTD.get(currency) || 0;
          expenditureByCurrencyYTD.set(currency, current + expenditure);
        }
        const current = expenditureByCurrencyAllTime.get(currency) || 0;
        expenditureByCurrencyAllTime.set(currency, current + expenditure);
      }
    });

    // Convert maps to arrays
    incomeByCurrencyYTD.forEach((amount, currency) => {
      incomeBreakdownYTD.push({ currency, amount });
    });
    incomeByCurrencyAllTime.forEach((amount, currency) => {
      incomeBreakdownAllTime.push({ currency, amount });
    });
    expenditureByCurrencyYTD.forEach((amount, currency) => {
      expenditureBreakdownYTD.push({ currency, amount });
    });
    expenditureByCurrencyAllTime.forEach((amount, currency) => {
      expenditureBreakdownAllTime.push({ currency, amount });
    });

    // Calculate totals (will be converted on client side)
    const incomeYTD = Array.from(incomeByCurrencyYTD.values()).reduce(
      (sum, val) => sum + val,
      0
    );
    const incomeAllTime = Array.from(incomeByCurrencyAllTime.values()).reduce(
      (sum, val) => sum + val,
      0
    );
    const expenditureYTD = Array.from(expenditureByCurrencyYTD.values()).reduce(
      (sum, val) => sum + val,
      0
    );
    const expenditureAllTime = Array.from(
      expenditureByCurrencyAllTime.values()
    ).reduce((sum, val) => sum + val, 0);

    const savingsYTD = incomeYTD - expenditureYTD;
    const savingsAllTime = incomeAllTime - expenditureAllTime;

    // Calculate Savings Rate and Spending Rate (more meaningful than percentage changes)
    // Savings Rate = (Saved / Earned) × 100
    // Spending Rate = (Spent / Earned) × 100
    let savingsRateYTD: number | null = null;
    let savingsRateAllTime: number | null = null;
    let spendingRateYTD: number | null = null;
    let spendingRateAllTime: number | null = null;

    if (incomeYTD !== 0) {
      savingsRateYTD = (savingsYTD / incomeYTD) * 100;
      spendingRateYTD = (expenditureYTD / incomeYTD) * 100;
    }

    if (incomeAllTime !== 0) {
      savingsRateAllTime = (savingsAllTime / incomeAllTime) * 100;
      spendingRateAllTime = (expenditureAllTime / incomeAllTime) * 100;
    }

    // Calculate YTD and All Time percentage changes (not YoY) - keeping for Net Worth
    let incomePercentageYTD: number | null = null;
    let expenditurePercentageYTD: number | null = null;
    let savingsPercentageYTD: number | null = null;
    let incomePercentageAllTime: number | null = null;
    let expenditurePercentageAllTime: number | null = null;
    let savingsPercentageAllTime: number | null = null;

    // Calculate YTD changes: Compare Jan 2025 to current month (Oct 2025)
    if (latestMonth.startsWith(currentYear)) {
      const ytdStartMonth = `${currentYear}-01`;
      const januaryIncomeByCurrency = new Map<Currency, number>();
      const januaryExpenditureByCurrency = new Map<Currency, number>();

      entries.forEach((entry) => {
        if (entry.month === ytdStartMonth) {
          const currency = (entry.accountCurrency || "GBP") as Currency;
          const income = Number(entry.income || 0);
          const expenditure = Number(entry.expenditure || 0);

          if (entry.accountType === "Current") {
            const current = januaryIncomeByCurrency.get(currency) || 0;
            januaryIncomeByCurrency.set(currency, current + income);
          }

          if (
            entry.accountType === "Current" ||
            entry.accountType === "Credit_Card"
          ) {
            const current = januaryExpenditureByCurrency.get(currency) || 0;
            januaryExpenditureByCurrency.set(currency, current + expenditure);
          }
        }
      });

      const januaryIncome = Array.from(januaryIncomeByCurrency.values()).reduce(
        (sum, val) => sum + val,
        0
      );
      const januaryExpenditure = Array.from(
        januaryExpenditureByCurrency.values()
      ).reduce((sum, val) => sum + val, 0);
      const januarySavings = januaryIncome - januaryExpenditure;

      // Calculate YTD percentages: (Current - January) / January * 100
      if (januaryIncome !== 0) {
        incomePercentageYTD =
          ((incomeYTD - januaryIncome) / Math.abs(januaryIncome)) * 100;
      }
      if (januaryExpenditure !== 0) {
        expenditurePercentageYTD =
          ((expenditureYTD - januaryExpenditure) /
            Math.abs(januaryExpenditure)) *
          100;
      }
      if (januarySavings !== 0) {
        savingsPercentageYTD =
          ((savingsYTD - januarySavings) / Math.abs(januarySavings)) * 100;
      }
    }

    // Calculate current net worth for latest month
    const currentNetWorth = allAccounts.reduce((total, account) => {
      const entry = latestMonthEntries.find((e) => e.accountId === account.id);
      const balance = Number(entry?.endingBalance || 0);

      if (account.type === "Credit_Card" || account.type === "Loan") {
        return total - balance;
      }
      return total + balance;
    }, 0);

    // Get all entries ordered for All Time calculations (for both income/expenditure and net worth)
    const allEntriesOrdered = await db
      .select({
        month: monthlyEntries.month,
        accountId: monthlyEntries.accountId,
        income: monthlyEntries.income,
        expenditure: monthlyEntries.expenditure,
        endingBalance: monthlyEntries.endingBalance,
        accountType: accountsTable.type,
        accountCurrency: accountsTable.currency,
      })
      .from(monthlyEntries)
      .innerJoin(accountsTable, eq(monthlyEntries.accountId, accountsTable.id))
      .where(inArray(monthlyEntries.accountId, accessibleAccountIds))
      .orderBy(asc(monthlyEntries.month));

    // Calculate All Time changes: Compare first entry to current
    if (allEntriesOrdered.length > 0) {
      const firstMonth = allEntriesOrdered[0].month;
      const firstMonthIncomeByCurrency = new Map<Currency, number>();
      const firstMonthExpenditureByCurrency = new Map<Currency, number>();

      allEntriesOrdered.forEach((entry) => {
        if (entry.month === firstMonth) {
          const currency = (entry.accountCurrency || "GBP") as Currency;
          const income = Number(entry.income || 0);
          const expenditure = Number(entry.expenditure || 0);

          if (entry.accountType === "Current") {
            const current = firstMonthIncomeByCurrency.get(currency) || 0;
            firstMonthIncomeByCurrency.set(currency, current + income);
          }

          if (
            entry.accountType === "Current" ||
            entry.accountType === "Credit_Card"
          ) {
            const current = firstMonthExpenditureByCurrency.get(currency) || 0;
            firstMonthExpenditureByCurrency.set(
              currency,
              current + expenditure
            );
          }
        }
      });

      const firstMonthIncome = Array.from(
        firstMonthIncomeByCurrency.values()
      ).reduce((sum, val) => sum + val, 0);
      const firstMonthExpenditure = Array.from(
        firstMonthExpenditureByCurrency.values()
      ).reduce((sum, val) => sum + val, 0);
      const firstMonthSavings = firstMonthIncome - firstMonthExpenditure;

      // Calculate All Time percentages: (Current - First) / First * 100
      if (firstMonthIncome !== 0) {
        incomePercentageAllTime =
          ((incomeAllTime - firstMonthIncome) / Math.abs(firstMonthIncome)) *
          100;
      }
      if (firstMonthExpenditure !== 0) {
        expenditurePercentageAllTime =
          ((expenditureAllTime - firstMonthExpenditure) /
            Math.abs(firstMonthExpenditure)) *
          100;
      }
      if (firstMonthSavings !== 0) {
        savingsPercentageAllTime =
          ((savingsAllTime - firstMonthSavings) / Math.abs(firstMonthSavings)) *
          100;
      }
    }

    // Calculate net worth percentages
    let netWorthPercentageYTD: number | null = null;
    let netWorthPercentageAllTime: number | null = null;
    let netWorthAllTime = currentNetWorth; // Default to current if no first entry

    if (allEntriesOrdered.length > 0) {
      // Get first entry month for all-time comparison
      const firstMonth = allEntriesOrdered[0].month;
      const firstMonthEntries = allEntriesOrdered.filter(
        (entry) => entry.month === firstMonth
      );

      if (firstMonthEntries.length > 0 && firstMonth !== latestMonth) {
        const firstNetWorth = allAccounts.reduce((total, account) => {
          const entry = firstMonthEntries.find(
            (e) => e.accountId === account.id
          );
          const balance = Number(entry?.endingBalance || 0);

          if (account.type === "Credit_Card" || account.type === "Loan") {
            return total - balance;
          }
          return total + balance;
        }, 0);

        netWorthAllTime = firstNetWorth;

        // Calculate All Time percentage: (Current - First) / First * 100
        if (firstNetWorth !== 0) {
          netWorthPercentageAllTime =
            ((currentNetWorth - firstNetWorth) / Math.abs(firstNetWorth)) * 100;
        }
      }

      // Calculate YTD percentage if we have data for current year
      if (latestMonth.startsWith(currentYear)) {
        const ytdStartMonth = `${currentYear}-01`;
        const januaryEntries = allEntriesOrdered.filter(
          (entry) => entry.month === ytdStartMonth
        );

        if (januaryEntries.length > 0) {
          const januaryNetWorth = allAccounts.reduce((total, account) => {
            const entry = januaryEntries.find(
              (e) => e.accountId === account.id
            );
            const balance = Number(entry?.endingBalance || 0);

            if (account.type === "Credit_Card" || account.type === "Loan") {
              return total - balance;
            }
            return total + balance;
          }, 0);

          if (januaryNetWorth !== 0) {
            netWorthPercentageYTD =
              ((currentNetWorth - januaryNetWorth) /
                Math.abs(januaryNetWorth)) *
              100;
          }
        }
      }
    }

    return {
      netWorthYTD: currentNetWorth,
      netWorthAllTime,
      netWorthPercentageYTD,
      netWorthPercentageAllTime,
      incomeYTD,
      incomeAllTime,
      incomePercentageYTD,
      incomePercentageAllTime,
      expenditureYTD,
      expenditureAllTime,
      expenditurePercentageYTD,
      expenditurePercentageAllTime,
      savingsYTD,
      savingsAllTime,
      savingsPercentageYTD,
      savingsPercentageAllTime,
      savingsRateYTD,
      savingsRateAllTime,
      spendingRateYTD,
      spendingRateAllTime,
      incomeBreakdownYTD,
      incomeBreakdownAllTime,
      expenditureBreakdownYTD,
      expenditureBreakdownAllTime,
      latestMonth,
    };
  } catch (error) {
    console.error("Error getting financial metrics:", error);
    return {
      netWorthYTD: 0,
      netWorthAllTime: 0,
      netWorthPercentageYTD: null,
      netWorthPercentageAllTime: null,
      incomeYTD: 0,
      incomeAllTime: 0,
      incomePercentageYTD: null,
      incomePercentageAllTime: null,
      expenditureYTD: 0,
      expenditureAllTime: 0,
      expenditurePercentageYTD: null,
      expenditurePercentageAllTime: null,
      savingsYTD: 0,
      savingsAllTime: 0,
      savingsPercentageYTD: null,
      savingsPercentageAllTime: null,
      savingsRateYTD: null,
      savingsRateAllTime: null,
      spendingRateYTD: null,
      spendingRateAllTime: null,
      incomeBreakdownYTD: [],
      incomeBreakdownAllTime: [],
      expenditureBreakdownYTD: [],
      expenditureBreakdownAllTime: [],
      latestMonth: null,
    };
  }
}

export async function getAccounts(includeClosed: boolean = false) {
  try {
    const accessibleUserIds = await getAccessibleUserIds();
    if (accessibleUserIds.length === 0) {
      return [];
    }

    // Build where condition
    const whereCondition = includeClosed
      ? inArray(accountsTable.userId, accessibleUserIds)
      : and(
          inArray(accountsTable.userId, accessibleUserIds),
          eq(accountsTable.isClosed, false)
        );

    const dbAccounts = await db
      .select()
      .from(accountsTable)
      .where(whereCondition)
      .orderBy(asc(accountsTable.displayOrder), asc(accountsTable.createdAt));

    // Transform the data to match the client-side Account type
    return dbAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      isISA: account.isISA,
      owner: account.owner,
      category: account.category,
      currency: account.currency,
      isClosed: account.isClosed,
      closedAt: account.closedAt,
      displayOrder: account.displayOrder ?? 0,
    }));
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return [];
  }
}

export async function getMonthlyData() {
  try {
    const accessibleUserIds = await getAccessibleUserIds();
    if (accessibleUserIds.length === 0) {
      return {};
    }

    // Get accounts for accessible users
    const accessibleAccounts = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(inArray(accountsTable.userId, accessibleUserIds));

    const accessibleAccountIds = accessibleAccounts.map((acc) => acc.id);

    if (accessibleAccountIds.length === 0) {
      return {};
    }

    // Get monthly entries only for accessible accounts
    const entries = await db
      .select()
      .from(monthlyEntries)
      .where(inArray(monthlyEntries.accountId, accessibleAccountIds))
      .orderBy(desc(monthlyEntries.month), monthlyEntries.accountId);

    // Transform the data into the required format
    const monthlyData: Record<
      string,
      Array<{
        accountId: string;
        monthKey: string;
        month: string;
        endingBalance: number;
        cashIn: number;
        cashOut: number;
        income: number;
        internalTransfersOut: number;
        debtPayments: number;
        expenditure: number;
        cashFlow: number;
        accountGrowth: number;
      }>
    > = {};

    // First pass: organize entries by month
    entries.forEach((entry) => {
      const month = entry.month;
      if (!monthlyData[month]) {
        monthlyData[month] = [];
      }

      // cashFlow = cashIn - cashOut
      // Note: cashIn now includes income, cashOut now includes expenditure
      const cashFlow = Number(entry.cashIn) - Number(entry.cashOut);
      monthlyData[month].push({
        accountId: entry.accountId,
        monthKey: month,
        month: month,
        endingBalance: Number(entry.endingBalance),
        cashIn: Number(entry.cashIn),
        cashOut: Number(entry.cashOut),
        income: Number(entry.income || 0),
        internalTransfersOut: Number(entry.internalTransfersOut || 0),
        debtPayments: Number(entry.debtPayments || 0),
        expenditure: Number(entry.expenditure || 0),
        cashFlow,
        accountGrowth: 0, // Will be calculated in second pass
      });
    });

    // Second pass: calculate accountGrowth by finding previous month's entry
    const months = Object.keys(monthlyData).sort();
    for (let i = 1; i < months.length; i++) {
      const currentMonth = months[i];
      const previousMonth = months[i - 1];

      monthlyData[currentMonth].forEach((entry) => {
        const previousEntry = monthlyData[previousMonth].find(
          (e) => e.accountId === entry.accountId
        );

        if (previousEntry) {
          // accountGrowth = currentBalance - previousBalance - cashFlow
          entry.accountGrowth =
            entry.endingBalance - previousEntry.endingBalance - entry.cashFlow;
        }
      });
    }

    return monthlyData;
  } catch (error) {
    console.error("Error getting monthly data:", error);
    return {};
  }
}

export async function createAccount(data: {
  name: string;
  type:
    | "Current"
    | "Savings"
    | "Investment"
    | "Stock"
    | "Crypto"
    | "Pension"
    | "Commodity"
    | "Stock_options"
    | "Credit_Card"
    | "Loan";
  category: "Cash" | "Investments";
  isISA: boolean;
  owner: string;
  currency: "GBP" | "EUR" | "USD" | "AED";
}) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Get the maximum display_order for this user's accounts
    const existingAccounts = await db
      .select({ displayOrder: accountsTable.displayOrder })
      .from(accountsTable)
      .where(eq(accountsTable.userId, userId))
      .orderBy(desc(accountsTable.displayOrder))
      .limit(1);

    const maxDisplayOrder = existingAccounts[0]?.displayOrder ?? -1;
    const newDisplayOrder = maxDisplayOrder + 1;

    const [account] = await db
      .insert(accountsTable)
      .values({
        name: data.name,
        type: data.type,
        category: data.category,
        isISA: data.isISA,
        owner: data.owner,
        currency: data.currency,
        userId: userId,
        displayOrder: newDisplayOrder,
      })
      .returning();

    revalidatePath("/");
    return { success: true, account };
  } catch (error) {
    console.error("Error creating account:", error);
    return { success: false, error: "Failed to create account" };
  }
}

export async function updateAccount(data: {
  id: string;
  name: string;
  type:
    | "Current"
    | "Savings"
    | "Investment"
    | "Stock"
    | "Crypto"
    | "Pension"
    | "Commodity"
    | "Stock_options"
    | "Credit_Card"
    | "Loan";
  category: "Cash" | "Investments";
  isISA: boolean;
  owner: string;
  currency: "GBP" | "EUR" | "USD" | "AED";
}) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const [account] = await db
      .update(accountsTable)
      .set({
        name: data.name,
        type: data.type,
        category: data.category,
        isISA: data.isISA,
        owner: data.owner,
        currency: data.currency,
        updatedAt: new Date(),
      })
      .where(eq(accountsTable.id, data.id))
      .returning();

    revalidatePath("/");
    return { success: true, account };
  } catch (error) {
    console.error("Error updating account:", error);
    return { success: false, error: "Failed to update account" };
  }
}

export async function deleteAccount(accountId: string) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // First delete all monthly entries for this account
    await db
      .delete(monthlyEntries)
      .where(eq(monthlyEntries.accountId, accountId));

    // Then delete the account
    await db.delete(accountsTable).where(eq(accountsTable.id, accountId));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting account:", error);
    return { success: false, error: "Failed to delete account" };
  }
}

export async function addMonthlyEntry(
  accountId: string,
  month: string,
  entry: {
    endingBalance: number;
    cashIn: number;
    cashOut: number;
    income: number;
    internalTransfersOut?: number;
    debtPayments?: number;
  }
) {
  try {
    // Check if an entry already exists for this account and month
    const existingEntry = await db
      .select()
      .from(monthlyEntries)
      .where(
        and(
          eq(monthlyEntries.accountId, accountId),
          eq(monthlyEntries.month, month)
        )
      )
      .limit(1);

    if (existingEntry.length > 0) {
      return {
        success: false,
        error: "An entry for this month already exists",
      };
    }

    // Compute expenditure: cashOut - internalTransfersOut - debtPayments
    const internalTransfersOut = entry.internalTransfersOut || 0;
    const debtPayments = entry.debtPayments || 0;
    const expenditure = entry.cashOut - internalTransfersOut - debtPayments;

    // Insert the new entry
    const newEntry = {
      accountId,
      month,
      endingBalance: entry.endingBalance.toString(),
      cashIn: entry.cashIn.toString(),
      cashOut: entry.cashOut.toString(),
      income: (entry.income || 0).toString(),
      internalTransfersOut: internalTransfersOut.toString(),
      debtPayments: debtPayments.toString(),
      expenditure: Math.max(0, expenditure).toString(), // Ensure non-negative
    };

    await db.insert(monthlyEntries).values(newEntry);

    // Automatically fetch and save FX rates for this month if they don't exist
    // This is done asynchronously and won't block the monthly entry creation
    fetchAndSaveExchangeRatesForMonth(month).catch((error) => {
      // Log error but don't fail the operation
      console.error(
        `Failed to fetch FX rates for month ${month} (non-blocking):`,
        error
      );
    });

    // Revalidate the page to show the new data
    revalidatePath("/");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error adding monthly entry:", error);
    return {
      success: false,
      error: "Failed to add monthly entry",
    };
  }
}

export async function updateMonthlyEntry(
  accountId: string,
  month: string,
  entry: {
    endingBalance: number;
    cashIn: number;
    cashOut: number;
    income: number;
    internalTransfersOut?: number;
    debtPayments?: number;
  }
) {
  try {
    // Check if the entry exists
    const existingEntry = await db
      .select()
      .from(monthlyEntries)
      .where(
        and(
          eq(monthlyEntries.accountId, accountId),
          eq(monthlyEntries.month, month)
        )
      )
      .limit(1);

    if (existingEntry.length === 0) {
      return {
        success: false,
        error: "Entry not found",
      };
    }

    // Compute expenditure: cashOut - internalTransfersOut - debtPayments
    const internalTransfersOut = entry.internalTransfersOut || 0;
    const debtPayments = entry.debtPayments || 0;
    const expenditure = entry.cashOut - internalTransfersOut - debtPayments;

    // Update the entry
    await db
      .update(monthlyEntries)
      .set({
        endingBalance: entry.endingBalance.toString(),
        cashIn: entry.cashIn.toString(),
        cashOut: entry.cashOut.toString(),
        income: (entry.income || 0).toString(),
        internalTransfersOut: internalTransfersOut.toString(),
        debtPayments: debtPayments.toString(),
        expenditure: Math.max(0, expenditure).toString(), // Ensure non-negative
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(monthlyEntries.accountId, accountId),
          eq(monthlyEntries.month, month)
        )
      );

    // Revalidate the page to show the updated data
    revalidatePath("/");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating monthly entry:", error);
    return {
      success: false,
      error: "Failed to update monthly entry",
    };
  }
}

export async function getChartData(
  timePeriod: "1M" | "3M" | "6M" | "1Y" | "YTD" | "all",
  owner: string = "all",
  selectedAccountIds: string[] = [],
  selectedTypes: string[] = [],
  selectedCategories: string[] = []
) {
  try {
    type Currency = "GBP" | "EUR" | "USD" | "AED";

    // Get accessible user IDs to filter data - this is critical for performance and security
    const accessibleUserIds = await getAccessibleUserIds();
    if (accessibleUserIds.length === 0) {
      return {
        netWorthData: [],
        accountData: [],
        accountTypeData: [],
        categoryData: [],
        sourceData: [],
        accounts: [],
      };
    }

    // Get accounts filtered by accessible user IDs first (performance optimization)
    const accounts = await db
      .select()
      .from(accountsTable)
      .where(inArray(accountsTable.userId, accessibleUserIds));

    // Filter accounts by owner if specified
    let filteredAccounts =
      owner === "all"
        ? accounts
        : accounts.filter((account) => account.owner === owner);

    // Filter accounts by selected account IDs if specified
    if (selectedAccountIds.length > 0) {
      filteredAccounts = filteredAccounts.filter((account) =>
        selectedAccountIds.includes(account.id)
      );
    }

    // Filter accounts by selected types if specified
    if (selectedTypes.length > 0) {
      filteredAccounts = filteredAccounts.filter((account) =>
        selectedTypes.includes(account.type)
      );
    }

    // Filter accounts by selected categories if specified
    if (selectedCategories.length > 0) {
      filteredAccounts = filteredAccounts.filter((account) =>
        selectedCategories.includes(account.category)
      );
    }

    // Filter monthly entries to only include entries for filtered accounts (performance optimization)
    // This prevents querying all entries from all users
    const filteredAccountIds = filteredAccounts.map((account) => account.id);

    // Get monthly entries only for filtered accounts
    const entries =
      filteredAccountIds.length > 0
        ? await db
            .select()
            .from(monthlyEntries)
            .where(inArray(monthlyEntries.accountId, filteredAccountIds))
            .orderBy(desc(monthlyEntries.month))
        : [];

    // Transform the data into the required format
    const monthlyData: Record<
      string,
      Array<{
        accountId: string;
        monthKey: string;
        month: string;
        endingBalance: number;
        cashIn: number;
        cashOut: number;
        income: number;
        internalTransfersOut: number;
        debtPayments: number;
        expenditure: number;
        cashFlow: number;
        accountGrowth: number;
      }>
    > = {};

    // First pass: organize entries by month
    entries.forEach((entry) => {
      const month = entry.month;
      if (!monthlyData[month]) {
        monthlyData[month] = [];
      }

      // Note: cashIn now includes income, cashOut now includes expenditure
      const cashFlow = Number(entry.cashIn) - Number(entry.cashOut);
      monthlyData[month].push({
        accountId: entry.accountId,
        monthKey: month,
        month: month,
        endingBalance: Number(entry.endingBalance),
        cashIn: Number(entry.cashIn),
        cashOut: Number(entry.cashOut),
        income: Number(entry.income || 0),
        internalTransfersOut: Number(entry.internalTransfersOut || 0),
        debtPayments: Number(entry.debtPayments || 0),
        expenditure: Number(entry.expenditure || 0),
        cashFlow,
        accountGrowth: 0, // Will be calculated in second pass
      });
    });

    // Second pass: calculate accountGrowth by finding previous month's entry
    const months = Object.keys(monthlyData).sort();
    for (let i = 1; i < months.length; i++) {
      const currentMonth = months[i];
      const previousMonth = months[i - 1];

      monthlyData[currentMonth].forEach((entry) => {
        const previousEntry = monthlyData[previousMonth].find(
          (e) => e.accountId === entry.accountId
        );

        if (previousEntry) {
          entry.accountGrowth =
            entry.endingBalance - previousEntry.endingBalance - entry.cashFlow;
        }
      });
    }

    const filteredMonths = getFilteredMonths(months, timePeriod);

    // Calculate net worth over time (raw values, no conversion)
    const netWorthData = filteredMonths.map((month) => ({
      month: new Date(month + "-01").toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
      monthKey: month, // Keep original month key for conversion
      netWorth: monthlyData[month]
        .filter((entry) =>
          filteredAccounts.some((account) => account.id === entry.accountId)
        )
        .reduce((sum, entry) => {
          const account = filteredAccounts.find(
            (acc) => acc.id === entry.accountId
          );
          // Credit cards and loans are liabilities - subtract from net worth
          if (account?.type === "Credit_Card" || account?.type === "Loan") {
            return sum - entry.endingBalance;
          }
          // All other accounts are assets - add to net worth
          return sum + entry.endingBalance;
        }, 0),
      // Store account currencies for client-side conversion
      accountBalances: monthlyData[month]
        .filter((entry) =>
          filteredAccounts.some((account) => account.id === entry.accountId)
        )
        .map((entry) => {
          const account = filteredAccounts.find(
            (acc) => acc.id === entry.accountId
          );
          return {
            accountId: entry.accountId,
            balance: entry.endingBalance,
            currency: (account?.currency || "GBP") as Currency,
            isLiability:
              account?.type === "Credit_Card" || account?.type === "Loan",
          };
        }),
    }));

    // Calculate net worth by account over time (raw values, no conversion)
    const accountData = filteredMonths.map((month) => {
      const monthData: {
        month: string;
        monthKey: string;
        [key: string]: number | string;
      } = {
        month: new Date(month + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        }),
        monthKey: month,
      };

      monthlyData[month].forEach((entry) => {
        const account = filteredAccounts.find((a) => a.id === entry.accountId);
        if (account) {
          // Create a unique name by combining account name, type, and ISA status
          const uniqueName = `${account.name} (${account.type}${
            account.isISA ? " ISA" : ""
          })`;
          // Credit cards and loans are liabilities - show as negative values
          if (account.type === "Credit_Card" || account.type === "Loan") {
            monthData[uniqueName] = -entry.endingBalance;
          } else {
            monthData[uniqueName] = entry.endingBalance;
          }
          // Store currency info for client-side conversion
          monthData[`${uniqueName}_currency`] = (account.currency ||
            "GBP") as string;
        }
      });

      return monthData;
    });

    // Calculate net worth by account type over time (raw values, no conversion)
    const accountTypeData = filteredMonths.map((month) => {
      const monthData: {
        month: string;
        monthKey: string;
        [key: string]: number | string;
      } = {
        month: new Date(month + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        }),
        monthKey: month,
      };

      // Group accounts by type
      const accountsByType = filteredAccounts.reduce((acc, account) => {
        if (!acc[account.type]) {
          acc[account.type] = [];
        }
        acc[account.type].push(account);
        return acc;
      }, {} as Record<string, typeof filteredAccounts>);

      // Calculate total for each account type (raw values)
      Object.entries(accountsByType).forEach(([type, accounts]) => {
        monthData[type] = accounts.reduce((sum, account) => {
          const entry = monthlyData[month].find(
            (e) => e.accountId === account.id
          );
          const balance = entry?.endingBalance || 0;
          // Credit cards and loans are liabilities - subtract from totals
          if (account.type === "Credit_Card" || account.type === "Loan") {
            return sum - balance;
          }
          // All other accounts are assets - add to totals
          return sum + balance;
        }, 0);
        // Store currency info for each account type
        const currencies = accounts.map((acc) => ({
          currency: (acc.currency || "GBP") as Currency,
          balance:
            monthlyData[month].find((e) => e.accountId === acc.id)
              ?.endingBalance || 0,
          isLiability: acc.type === "Credit_Card" || acc.type === "Loan",
        }));
        monthData[`${type}_currencies`] = JSON.stringify(currencies);
      });

      return monthData;
    });

    // Calculate net worth by category over time (raw values, no conversion)
    const categoryData = filteredMonths.map((month) => {
      const monthData: {
        month: string;
        monthKey: string;
        [key: string]: number | string;
      } = {
        month: new Date(month + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        }),
        monthKey: month,
      };

      // Group accounts by category
      const accountsByCategory = filteredAccounts.reduce((acc, account) => {
        const category = account.category || "Uncategorized";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(account);
        return acc;
      }, {} as Record<string, typeof filteredAccounts>);

      // Calculate total for each category (raw values)
      Object.entries(accountsByCategory).forEach(([category, accounts]) => {
        monthData[category] = accounts.reduce((sum, account) => {
          const entry = monthlyData[month].find(
            (e) => e.accountId === account.id
          );
          const balance = entry?.endingBalance || 0;
          // Credit cards and loans are liabilities - subtract from totals
          if (account.type === "Credit_Card" || account.type === "Loan") {
            return sum - balance;
          }
          // All other accounts are assets - add to totals
          return sum + balance;
        }, 0);
        // Store currency info for each category
        const currencies = accounts.map((acc) => ({
          currency: (acc.currency || "GBP") as Currency,
          balance:
            monthlyData[month].find((e) => e.accountId === acc.id)
              ?.endingBalance || 0,
          isLiability: acc.type === "Credit_Card" || acc.type === "Loan",
        }));
        monthData[`${category}_currencies`] = JSON.stringify(currencies);
      });

      return monthData;
    });

    // Calculate growth by source over time (raw values, no conversion)
    const sourceData = filteredMonths.map((month) => {
      let interestEarned = 0;
      let capitalGains = 0;
      let totalWorkIncome = 0;
      let totalExpenditure = 0;

      // Per-account breakdowns (with currency info)
      const savingsAccounts: Array<{
        accountId: string;
        name: string;
        type: string;
        amount: number;
        currency: Currency;
        owner: string;
      }> = [];
      const interestAccounts: Array<{
        accountId: string;
        name: string;
        type: string;
        amount: number;
        currency: Currency;
        owner: string;
      }> = [];
      const capitalGainsAccounts: Array<{
        accountId: string;
        name: string;
        type: string;
        amount: number;
        currency: Currency;
        owner: string;
      }> = [];

      // Process account entries
      monthlyData[month].forEach((entry) => {
        const account = filteredAccounts.find((a) => a.id === entry.accountId);
        if (!account) return;

        const accountCurrency = (account.currency || "GBP") as Currency;

        // Add income to total (only from Current accounts)
        if (account.type === "Current") {
          const income = Number(entry.income || 0);
          totalWorkIncome += income;

          // Track accounts that received income for breakdown
          if (income > 0) {
            savingsAccounts.push({
              accountId: account.id,
              name: account.name,
              type: account.type,
              amount: income, // Show income in breakdown
              currency: accountCurrency,
              owner: account.owner || "Unknown",
            });
          }

          // Add expenditure from Current accounts
          const expenditure = Number(entry.expenditure || 0);
          totalExpenditure += expenditure;
        }

        // Add Credit Card expenditure to total expenditure (spending on cards is expenditure)
        // For credit cards, expenditure = cashOut - internalTransfersOut - debtPayments
        // (though credit cards typically won't have internal transfers or debt payments)
        if (account.type === "Credit_Card") {
          const expenditure = Number(entry.expenditure || 0);
          totalExpenditure += expenditure;
        }

        // Calculate interest earned (if applicable)
        if (account.type === "Savings" && entry.accountGrowth > 0) {
          interestEarned += entry.accountGrowth;
          interestAccounts.push({
            accountId: account.id,
            name: account.name,
            type: account.type,
            amount: entry.accountGrowth,
            currency: accountCurrency,
            owner: account.owner || "Unknown",
          });
        }

        // Calculate capital gains (remaining growth, excluding current and savings accounts)
        if (
          entry.accountGrowth !== 0 &&
          account.type !== "Current" &&
          account.type !== "Savings"
        ) {
          capitalGains += entry.accountGrowth;
          capitalGainsAccounts.push({
            accountId: account.id,
            name: account.name,
            type: account.type,
            amount: entry.accountGrowth,
            currency: accountCurrency,
            owner: account.owner || "Unknown",
          });
        }
      });

      // Calculate savings from income: Income - Expenditure
      // This represents the net cash saved from work income (after spending)
      // This is a cash flow calculation, not based on net worth changes
      const savingsFromIncome = totalWorkIncome - totalExpenditure;

      return {
        month: new Date(month + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        }),
        monthKey: month,
        "Savings from Income": savingsFromIncome,
        "Interest Earned": interestEarned,
        "Capital Gains": capitalGains,
        "Total Income": totalWorkIncome,
        "Total Expenditure": totalExpenditure,
        "Savings Rate":
          totalWorkIncome > 0
            ? Number(((savingsFromIncome / totalWorkIncome) * 100).toFixed(1))
            : 0,
        breakdown: {
          "Savings from Income": savingsAccounts,
          "Interest Earned": interestAccounts,
          "Capital Gains": capitalGainsAccounts,
        },
      };
    });

    return {
      netWorthData,
      accountData,
      accountTypeData,
      categoryData,
      sourceData,
      accounts: filteredAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        isISA: account.isISA,
        owner: account.owner,
        category: account.category,
      })),
    };
  } catch (error) {
    console.error("Error getting chart data:", error);
    return {
      netWorthData: [],
      accountData: [],
      accountTypeData: [],
      categoryData: [],
      sourceData: [],
      accounts: [],
    };
  }
}

function getFilteredMonths(
  months: string[],
  timePeriod: "1M" | "3M" | "6M" | "1Y" | "YTD" | "all"
): string[] {
  if (months.length === 0) return months;

  // Get the latest month from the data (not current date)
  // months are sorted ascending (YYYY-MM format), so last is latest
  const latestMonth = months[months.length - 1];
  const [latestYear, latestMonthNum] = latestMonth.split("-").map(Number);
  // latestMonthNum is 1-indexed (1-12), Date constructor expects 0-indexed (0-11)

  switch (timePeriod) {
    case "1M": {
      // Go back 1 month from latest month
      const oneMonthAgo = new Date(latestYear, latestMonthNum - 2, 1);
      return months.filter((month) => new Date(month + "-01") >= oneMonthAgo);
    }
    case "3M": {
      // Go back 3 months from latest month
      const threeMonthsAgo = new Date(latestYear, latestMonthNum - 4, 1);
      return months.filter(
        (month) => new Date(month + "-01") >= threeMonthsAgo
      );
    }
    case "6M": {
      // Go back 6 months from latest month
      const sixMonthsAgo = new Date(latestYear, latestMonthNum - 7, 1);
      return months.filter((month) => new Date(month + "-01") >= sixMonthsAgo);
    }
    case "1Y": {
      // Go back 12 months from latest month
      const oneYearAgo = new Date(latestYear, latestMonthNum - 13, 1);
      return months.filter((month) => new Date(month + "-01") >= oneYearAgo);
    }
    case "YTD":
      // Year to date from the latest month's year
      return months.filter((month) => month.startsWith(latestYear.toString()));
    case "all":
    default:
      return months;
  }
}

export async function getCurrentValue(accountId: string) {
  try {
    // Get the latest monthly entry for the account
    const latestEntry = await db
      .select()
      .from(monthlyEntries)
      .where(eq(monthlyEntries.accountId, accountId))
      .orderBy(desc(monthlyEntries.month))
      .limit(1);

    // Return the ending balance from the latest entry, or 0 if no entries exist
    return latestEntry.length > 0 ? Number(latestEntry[0].endingBalance) : 0;
  } catch (error) {
    console.error("Error getting current value:", error);
    return 0;
  }
}

export async function getAccountHistory(accountId: string) {
  try {
    // Get all monthly entries for the account, ordered by month (desc)
    const entries = await db
      .select()
      .from(monthlyEntries)
      .where(eq(monthlyEntries.accountId, accountId))
      .orderBy(desc(monthlyEntries.month));

    // Transform the entries to include calculated fields
    const history = entries.map((entry, index) => {
      // Note: cashIn now includes income, cashOut now includes expenditure
      const cashFlow = Number(entry.cashIn) - Number(entry.cashOut);
      let accountGrowth = 0;

      // Calculate accountGrowth by comparing with previous month's entry
      if (index < entries.length - 1) {
        const previousEntry = entries[index + 1];
        accountGrowth =
          Number(entry.endingBalance) -
          Number(previousEntry.endingBalance) -
          cashFlow;
      }

      return {
        accountId: entry.accountId,
        monthKey: entry.month,
        month: entry.month,
        endingBalance: Number(entry.endingBalance),
        cashIn: Number(entry.cashIn),
        cashOut: Number(entry.cashOut),
        income: Number(entry.income || 0),
        internalTransfersOut: Number(entry.internalTransfersOut || 0),
        debtPayments: Number(entry.debtPayments || 0),
        expenditure: Number(entry.expenditure || 0),
        cashFlow,
        accountGrowth,
      };
    });

    return history;
  } catch (error) {
    console.error("Error getting account history:", error);
    return [];
  }
}

export async function calculateValueChange(
  accountId: string,
  timePeriod: "1M" | "3M" | "6M" | "1Y" | "YTD" | "ALL"
) {
  try {
    // Get all monthly entries for the account, ordered by month (desc)
    const entries = await db
      .select()
      .from(monthlyEntries)
      .where(eq(monthlyEntries.accountId, accountId))
      .orderBy(desc(monthlyEntries.month));

    if (entries.length === 0) {
      return { absoluteChange: 0, percentageChange: 0 };
    }

    const currentValue = Number(entries[0].endingBalance);
    let previousValue: number;

    switch (timePeriod) {
      case "1M":
        previousValue = entries[1] ? Number(entries[1].endingBalance) : 0;
        break;
      case "3M":
        previousValue = entries[3] ? Number(entries[3].endingBalance) : 0;
        break;
      case "6M":
        previousValue = entries[6] ? Number(entries[6].endingBalance) : 0;
        break;
      case "1Y":
        previousValue = entries[12] ? Number(entries[12].endingBalance) : 0;
        break;
      case "YTD":
        const currentYear = new Date().getFullYear();
        const ytdEntry = entries.find((entry) =>
          entry.month.startsWith(`${currentYear}-01`)
        );
        previousValue = ytdEntry ? Number(ytdEntry.endingBalance) : 0;
        break;
      case "ALL":
      default:
        previousValue = entries[entries.length - 1]
          ? Number(entries[entries.length - 1].endingBalance)
          : 0;
    }

    const absoluteChange = currentValue - previousValue;
    const percentageChange =
      previousValue === 0 ? 0 : (absoluteChange / previousValue) * 100;

    return { absoluteChange, percentageChange };
  } catch (error) {
    console.error("Error calculating value change:", error);
    return { absoluteChange: 0, percentageChange: 0 };
  }
}

export async function toggleAccountClosed(
  accountId: string,
  isClosed: boolean
) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const [account] = await db
      .update(accountsTable)
      .set({
        isClosed,
        closedAt: isClosed ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(accountsTable.id, accountId))
      .returning();

    revalidatePath("/");
    return { success: true, account };
  } catch (error) {
    console.error("Error toggling account closed status:", error);
    return { success: false, error: "Failed to update account status" };
  }
}

export async function getClosedAccounts() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return [];
    }

    const dbAccounts = await db
      .select()
      .from(accountsTable)
      .where(
        and(eq(accountsTable.userId, userId), eq(accountsTable.isClosed, true))
      )
      .orderBy(asc(accountsTable.displayOrder), desc(accountsTable.closedAt));

    return dbAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      isISA: account.isISA,
      owner: account.owner,
      category: account.category,
      isClosed: account.isClosed,
      closedAt: account.closedAt,
      displayOrder: account.displayOrder ?? 0,
    }));
  } catch (error) {
    console.error("Error fetching closed accounts:", error);
    return [];
  }
}

export async function updateAccountDisplayOrder(
  accountOrders: Array<{ id: string; displayOrder: number }>
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Update each account's display order in a transaction
    await db.transaction(async (tx) => {
      for (const { id, displayOrder } of accountOrders) {
        await tx
          .update(accountsTable)
          .set({
            displayOrder,
            updatedAt: new Date(),
          })
          .where(
            and(eq(accountsTable.id, id), eq(accountsTable.userId, userId))
          );
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating account display order:", error);
    return { success: false, error: "Failed to update account order" };
  }
}

// Helper function to escape CSV values
function escapeCSV(
  value: string | number | boolean | null | undefined
): string {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  // If the value contains comma, quote, or newline, wrap it in quotes and escape quotes
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export async function exportToCSV(): Promise<string> {
  try {
    // Get all accounts including closed ones
    const allAccounts = await db.select().from(accountsTable);

    // Get all monthly entries ordered by month (asc) and accountId for proper growth calculation
    const allEntries = await db
      .select()
      .from(monthlyEntries)
      .orderBy(monthlyEntries.month, monthlyEntries.accountId);

    // Create a map of accounts by ID for quick lookup
    const accountsMap = new Map(
      allAccounts.map((account) => [account.id, account])
    );

    // Define CSV headers
    const headers = [
      "Account ID",
      "Account Name",
      "Account Type",
      "Category",
      "Owner",
      "Is ISA",
      "Is Closed",
      "Closed Date",
      "Month",
      "Ending Balance",
      "Cash In",
      "Cash Out",
      "Income",
      "Expenditure",
      "Cash Flow",
      "Account Growth",
      "Entry Created At",
      "Entry Updated At",
    ];

    // Build CSV rows
    const rows: string[] = [headers.map(escapeCSV).join(",")];

    // Track previous entry for each account to calculate growth efficiently
    const previousEntryByAccount = new Map<string, (typeof allEntries)[0]>();

    // Process each entry (already sorted by month ASC)
    allEntries.forEach((entry) => {
      const account = accountsMap.get(entry.accountId);
      if (!account) return; // Skip if account not found

      // Calculate cash flow
      // Note: cashIn now includes income, cashOut now includes expenditure
      const cashFlow = Number(entry.cashIn) - Number(entry.cashOut);

      // Calculate account growth by comparing with previous month's entry
      let accountGrowth = 0;
      const previousEntry = previousEntryByAccount.get(entry.accountId);

      if (previousEntry) {
        accountGrowth =
          Number(entry.endingBalance) -
          Number(previousEntry.endingBalance) -
          cashFlow;
      }

      // Update previous entry for this account
      previousEntryByAccount.set(entry.accountId, entry);

      // Build row
      const row = [
        entry.accountId,
        account.name,
        account.type,
        account.category || "",
        account.owner || "",
        account.isISA ? "true" : "false",
        account.isClosed ? "true" : "false",
        account.closedAt ? new Date(account.closedAt).toISOString() : "",
        entry.month,
        Number(entry.endingBalance).toFixed(2),
        Number(entry.cashIn).toFixed(2),
        Number(entry.cashOut).toFixed(2),
        Number(entry.income || 0).toFixed(2),
        Number(entry.expenditure || 0).toFixed(2),
        cashFlow.toFixed(2),
        accountGrowth.toFixed(2),
        entry.createdAt ? new Date(entry.createdAt).toISOString() : "",
        entry.updatedAt ? new Date(entry.updatedAt).toISOString() : "",
      ];

      rows.push(row.map(escapeCSV).join(","));
    });

    return rows.join("\n");
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    throw new Error("Failed to export data to CSV");
  }
}

/**
 * Server action to fetch exchange rates for multiple months at once
 * Also includes the latest rate if requested
 * @param months - Array of months in "YYYY-MM" format
 * @returns Array of exchange rates for the last day of each month, plus latest if needed
 */
export async function fetchExchangeRatesForMonths(months: string[]): Promise<
  Array<{
    date: string;
    gbpRate: string;
    eurRate: string;
    usdRate: string;
    aedRate: string;
  }>
> {
  "use server";

  try {
    const { exchangeRates } = await import("@/db/schema");
    const { inArray, desc } = await import("drizzle-orm");

    const results: Array<{
      date: string;
      gbpRate: string;
      eurRate: string;
      usdRate: string;
      aedRate: string;
    }> = [];

    if (months.length > 0) {
      // Convert months to last day of month dates
      const dates = months.map((month) => {
        const [year, monthNum] = month.split("-").map(Number);
        const lastDay = new Date(year, monthNum, 0);
        return lastDay.toISOString().split("T")[0];
      });

      // Fetch all rates from database
      const rates = await db
        .select()
        .from(exchangeRates)
        .where(inArray(exchangeRates.date, dates));

      results.push(
        ...rates.map((rate) => ({
          date: rate.date,
          gbpRate: rate.gbpRate,
          eurRate: rate.eurRate,
          usdRate: rate.usdRate,
          aedRate: rate.aedRate,
        }))
      );
    }

    // Always include the latest rate for current value conversions
    const latestRate = await db
      .select()
      .from(exchangeRates)
      .orderBy(desc(exchangeRates.date))
      .limit(1);

    if (latestRate.length > 0) {
      const latest = latestRate[0];
      // Only add if not already in results
      if (!results.find((r) => r.date === latest.date)) {
        results.push({
          date: latest.date,
          gbpRate: latest.gbpRate,
          eurRate: latest.eurRate,
          usdRate: latest.usdRate,
          aedRate: latest.aedRate,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return [];
  }
}

/**
 * Server action to convert currency
 * This is needed because the HexaRate API doesn't allow direct browser requests (CORS)
 * @param forMonth - Optional month in "YYYY-MM" format to use historical rates
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  forMonth?: string
): Promise<number> {
  "use server";

  if (fromCurrency === toCurrency) {
    return amount;
  }

  try {
    // Import the server-side conversion function
    const { convertCurrency: convertCurrencyInternal } = await import(
      "@/lib/fx-rates-server"
    );
    return await convertCurrencyInternal(
      amount,
      fromCurrency,
      toCurrency,
      forMonth
    );
  } catch (error) {
    console.error("Error converting currency:", error);
    // Fallback to original amount if conversion fails
    return amount;
  }
}

// Projection Scenario CRUD Operations

export async function createProjectionScenario(data: {
  name: string;
  monthlyIncome: number;
  savingsRate: number;
  timePeriodMonths: number;
  growthRates: Record<AccountType, number>;
  savingsAllocation?: Record<AccountType, number>;
}) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const [scenario] = await db
      .insert(projectionScenarios)
      .values({
        userId,
        name: data.name,
        monthlyIncome: data.monthlyIncome.toString(),
        savingsRate: data.savingsRate.toString(),
        timePeriodMonths: data.timePeriodMonths,
        growthRates: data.growthRates,
        savingsAllocation: data.savingsAllocation || null,
      })
      .returning();

    revalidatePath("/");
    return { success: true, scenario };
  } catch (error) {
    console.error("Error creating projection scenario:", error);
    return { success: false, error: "Failed to create projection scenario" };
  }
}

export async function getProjectionScenarios() {
  try {
    const accessibleUserIds = await getAccessibleUserIds();
    if (accessibleUserIds.length === 0) {
      return [];
    }

    const scenarios = await db
      .select()
      .from(projectionScenarios)
      .where(inArray(projectionScenarios.userId, accessibleUserIds))
      .orderBy(desc(projectionScenarios.createdAt));

    return scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      monthlyIncome: Number(scenario.monthlyIncome),
      savingsRate: Number(scenario.savingsRate),
      timePeriodMonths: scenario.timePeriodMonths,
      growthRates: scenario.growthRates as Record<AccountType, number>,
      savingsAllocation:
        (scenario.savingsAllocation as Record<AccountType, number> | null) ||
        undefined,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
    }));
  } catch (error) {
    console.error("Error fetching projection scenarios:", error);
    return [];
  }
}

export async function updateProjectionScenario(
  id: string,
  data: {
    name: string;
    monthlyIncome: number;
    savingsRate: number;
    timePeriodMonths: number;
    growthRates: Record<AccountType, number>;
    savingsAllocation?: Record<AccountType, number>;
  }
) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const [scenario] = await db
      .update(projectionScenarios)
      .set({
        name: data.name,
        monthlyIncome: data.monthlyIncome.toString(),
        savingsRate: data.savingsRate.toString(),
        timePeriodMonths: data.timePeriodMonths,
        growthRates: data.growthRates,
        savingsAllocation: data.savingsAllocation || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectionScenarios.id, id),
          eq(projectionScenarios.userId, userId)
        )
      )
      .returning();

    revalidatePath("/");
    return { success: true, scenario };
  } catch (error) {
    console.error("Error updating projection scenario:", error);
    return { success: false, error: "Failed to update projection scenario" };
  }
}

export async function deleteProjectionScenario(id: string) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    await db
      .delete(projectionScenarios)
      .where(
        and(
          eq(projectionScenarios.id, id),
          eq(projectionScenarios.userId, userId)
        )
      );

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting projection scenario:", error);
    return { success: false, error: "Failed to delete projection scenario" };
  }
}

// Projection Calculation

export async function calculateProjection(data: {
  monthlyIncome: number;
  savingsRate: number;
  timePeriodMonths: number;
  growthRates: Record<AccountType, number>;
  savingsAllocation?: Record<AccountType, number>;
}) {
  try {
    const accessibleUserIds = await getAccessibleUserIds();
    if (accessibleUserIds.length === 0) {
      return {
        currentNetWorth: 0,
        finalNetWorth: 0,
        totalGrowth: 0,
        growthPercentage: 0,
        projectionData: [],
      };
    }

    // Get accounts for accessible users (excluding closed and liabilities)
    const allAccounts = await db
      .select()
      .from(accountsTable)
      .where(inArray(accountsTable.userId, accessibleUserIds));
    const activeAccounts = allAccounts.filter(
      (account) =>
        !account.isClosed &&
        account.type !== "Credit_Card" &&
        account.type !== "Loan"
    );

    // Get accessible account IDs
    const accessibleAccountIds = activeAccounts.map((acc) => acc.id);

    if (accessibleAccountIds.length === 0) {
      return {
        currentNetWorth: 0,
        finalNetWorth: 0,
        totalGrowth: 0,
        growthPercentage: 0,
        projectionData: [],
      };
    }

    // Get the latest monthly entries for accessible accounts
    const latestEntries = await db
      .select()
      .from(monthlyEntries)
      .where(inArray(monthlyEntries.accountId, accessibleAccountIds))
      .orderBy(desc(monthlyEntries.month));

    // Get current balances for each account
    const currentBalances = new Map<string, number>();
    activeAccounts.forEach((account) => {
      const latestEntry = latestEntries.find(
        (entry) => entry.accountId === account.id
      );
      const balance = Number(latestEntry?.endingBalance || 0);
      currentBalances.set(account.id, balance);
    });

    // Calculate total current net worth
    let currentNetWorth = 0;
    activeAccounts.forEach((account) => {
      currentNetWorth += currentBalances.get(account.id) || 0;
    });

    // Calculate monthly savings amount
    const monthlySavings = (data.monthlyIncome * data.savingsRate) / 100;

    // Calculate how to distribute savings across accounts
    const savingsDistribution = new Map<string, number>();
    if (activeAccounts.length === 0) {
      // No active accounts, return empty projection
      return {
        currentNetWorth: 0,
        finalNetWorth: 0,
        totalGrowth: 0,
        growthPercentage: 0,
        projectionData: [],
      };
    }

    // Asset account types (exclude Credit_Card and Loan)
    const assetAccountTypes: AccountType[] = [
      "Current",
      "Savings",
      "Investment",
      "Stock",
      "Crypto",
      "Pension",
      "Commodity",
      "Stock_options",
    ];

    if (data.savingsAllocation) {
      // Use user-defined savings allocation
      // Validate that accounts exist for each allocated type
      const allocatedTypes = Object.keys(data.savingsAllocation).filter(
        (type) => data.savingsAllocation![type as AccountType] > 0
      ) as AccountType[];

      // Check that at least one account exists for each allocated type
      for (const type of allocatedTypes) {
        if (!assetAccountTypes.includes(type)) {
          continue; // Skip non-asset types
        }
        const hasAccount = activeAccounts.some((acc) => acc.type === type);
        if (!hasAccount) {
          throw new Error(
            `No account found for allocated type: ${type}. Please create an account of this type or adjust your savings allocation.`
          );
        }
      }

      // Group accounts by type
      const accountsByType = new Map<AccountType, typeof activeAccounts>();
      assetAccountTypes.forEach((type) => {
        accountsByType.set(
          type,
          activeAccounts.filter((acc) => acc.type === type)
        );
      });

      // Distribute savings by type based on allocation percentages
      allocatedTypes.forEach((type) => {
        if (!assetAccountTypes.includes(type)) {
          return; // Skip non-asset types
        }
        const allocationPercent = data.savingsAllocation![type] || 0;
        const typeSavings = (monthlySavings * allocationPercent) / 100;
        const typeAccounts = accountsByType.get(type) || [];

        if (typeAccounts.length > 0) {
          // Distribute proportionally among accounts of this type based on current balances
          const typeTotalBalance = typeAccounts.reduce(
            (sum, acc) => sum + (currentBalances.get(acc.id) || 0),
            0
          );

          if (typeTotalBalance > 0) {
            // Distribute proportionally based on balances
            typeAccounts.forEach((account) => {
              const balance = currentBalances.get(account.id) || 0;
              const proportion = balance / typeTotalBalance;
              savingsDistribution.set(account.id, typeSavings * proportion);
            });
          } else {
            // If no balances, distribute evenly among accounts of this type
            const perAccount = typeSavings / typeAccounts.length;
            typeAccounts.forEach((account) => {
              savingsDistribution.set(account.id, perAccount);
            });
          }
        }
      });
    } else {
      // Fallback to proportional distribution based on current balances
      const totalBalance = Array.from(currentBalances.values()).reduce(
        (sum, balance) => sum + balance,
        0
      );

      if (totalBalance > 0) {
        activeAccounts.forEach((account) => {
          const balance = currentBalances.get(account.id) || 0;
          const proportion = balance / totalBalance;
          savingsDistribution.set(account.id, monthlySavings * proportion);
        });
      } else {
        // If no balances, distribute evenly
        const perAccount =
          activeAccounts.length > 0
            ? monthlySavings / activeAccounts.length
            : 0;
        activeAccounts.forEach((account) => {
          savingsDistribution.set(account.id, perAccount);
        });
      }
    }

    // Generate projection data month by month
    const projectionData: Array<{
      month: string;
      monthIndex: number;
      netWorth: number;
      accountBalances: Array<{
        accountId: string;
        accountName: string;
        accountType: AccountType;
        balance: number;
        currency: Currency;
      }>;
    }> = [];

    // Start with current balances
    const accountBalances = new Map<string, number>(currentBalances);
    const startDate = new Date();
    startDate.setDate(1); // Start of current month

    for (
      let monthIndex = 0;
      monthIndex <= data.timePeriodMonths;
      monthIndex++
    ) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(startDate.getMonth() + monthIndex);
      const monthKey = `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, "0")}`;

      // Calculate net worth for this month
      let monthNetWorth = 0;
      const monthAccountBalances: Array<{
        accountId: string;
        accountName: string;
        accountType: AccountType;
        balance: number;
        currency: Currency;
      }> = [];

      activeAccounts.forEach((account) => {
        let balance = accountBalances.get(account.id) || 0;

        // Apply growth rate (monthly compounding: annual rate / 12)
        const growthRate = data.growthRates[account.type] || 0;
        const monthlyGrowthRate = growthRate / 100 / 12;
        balance = balance * (1 + monthlyGrowthRate);

        // Add savings contribution (only for future months, not month 0)
        if (monthIndex > 0) {
          const savings = savingsDistribution.get(account.id) || 0;
          balance += savings;
        }

        // Update balance
        accountBalances.set(account.id, balance);
        monthNetWorth += balance;

        monthAccountBalances.push({
          accountId: account.id,
          accountName: account.name,
          accountType: account.type,
          balance,
          currency: (account.currency || "GBP") as Currency,
        });
      });

      projectionData.push({
        month: monthKey,
        monthIndex,
        netWorth: monthNetWorth,
        accountBalances: monthAccountBalances,
      });
    }

    return {
      currentNetWorth,
      finalNetWorth: projectionData[projectionData.length - 1]?.netWorth || 0,
      totalGrowth:
        (projectionData[projectionData.length - 1]?.netWorth || 0) -
        currentNetWorth,
      growthPercentage:
        currentNetWorth > 0
          ? (((projectionData[projectionData.length - 1]?.netWorth || 0) -
              currentNetWorth) /
              currentNetWorth) *
            100
          : 0,
      projectionData,
    };
  } catch (error) {
    console.error("Error calculating projection:", error);
    // Return error information instead of throwing to avoid Next.js serialization issues
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    // Return a response with error flag instead of throwing
    return {
      currentNetWorth: 0,
      finalNetWorth: 0,
      totalGrowth: 0,
      growthPercentage: 0,
      projectionData: [],
      error: errorMessage,
    };
  }
}
