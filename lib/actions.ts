"use server";

import { db } from "@/db";
import {
  accounts as accountsTable,
  monthlyEntries,
  projectionScenarios,
} from "@/db/schema";
import { desc, asc, eq, and } from "drizzle-orm";
import type { Account, MonthlyEntry } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/auth-helpers";
import type { Currency } from "@/lib/fx-rates";
import type { AccountType } from "@/lib/types";
import { fetchAndSaveExchangeRatesForMonth } from "@/lib/fx-rates-server";

export async function calculateNetWorth() {
  try {
    // Get all accounts
    const allAccounts = await db.select().from(accountsTable);

    // Get the latest monthly entries for each account
    const latestEntries = await db
      .select()
      .from(monthlyEntries)
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
    // Get all accounts
    const allAccounts = await db.select().from(accountsTable);

    // Get the latest monthly entries for each account
    const latestEntries = await db
      .select()
      .from(monthlyEntries)
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
    // Get all accounts
    const allAccounts = await db.select().from(accountsTable);

    // Get all monthly entries ordered by month
    const allEntries = await db
      .select()
      .from(monthlyEntries)
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

export async function getAccounts(includeClosed: boolean = false) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return [];
    }

    // Build where condition
    const whereCondition = includeClosed
      ? eq(accountsTable.userId, userId)
      : and(
          eq(accountsTable.userId, userId),
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
    // Get all monthly entries ordered by month (desc) and accountId
    const entries = await db
      .select()
      .from(monthlyEntries)
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
        workIncome: number;
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

      const cashFlow =
        Number(entry.cashIn) -
        Number(entry.cashOut) +
        Number(entry.workIncome || 0);
      monthlyData[month].push({
        accountId: entry.accountId,
        monthKey: month,
        month: month,
        endingBalance: Number(entry.endingBalance),
        cashIn: Number(entry.cashIn),
        cashOut: Number(entry.cashOut),
        workIncome: Number(entry.workIncome || 0),
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
    workIncome: number;
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

    // Insert the new entry
    const newEntry = {
      accountId,
      month,
      endingBalance: entry.endingBalance.toString(),
      cashIn: entry.cashIn.toString(),
      cashOut: entry.cashOut.toString(),
      workIncome: entry.workIncome.toString(),
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
    workIncome: number;
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

    // Update the entry
    await db
      .update(monthlyEntries)
      .set({
        endingBalance: entry.endingBalance.toString(),
        cashIn: entry.cashIn.toString(),
        cashOut: entry.cashOut.toString(),
        workIncome: (entry.workIncome || 0).toString(),
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
  timePeriod: "YTD" | "1Y" | "all",
  owner: string = "all",
  selectedAccountIds: string[] = [],
  selectedTypes: string[] = [],
  selectedCategories: string[] = []
) {
  try {
    type Currency = "GBP" | "EUR" | "USD" | "AED";

    // Get all monthly entries ordered by month (desc)
    const entries = await db
      .select()
      .from(monthlyEntries)
      .orderBy(desc(monthlyEntries.month));

    // Get all accounts
    const accounts = await db.select().from(accountsTable);

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
        workIncome: number;
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

      const cashFlow =
        Number(entry.cashIn) -
        Number(entry.cashOut) +
        Number(entry.workIncome || 0);
      monthlyData[month].push({
        accountId: entry.accountId,
        monthKey: month,
        month: month,
        endingBalance: Number(entry.endingBalance),
        cashIn: Number(entry.cashIn),
        cashOut: Number(entry.cashOut),
        workIncome: Number(entry.workIncome || 0),
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
      let savingsFromIncome = 0;
      let interestEarned = 0;
      let capitalGains = 0;
      let totalWorkIncome = 0;

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

      monthlyData[month].forEach((entry) => {
        const account = filteredAccounts.find((a) => a.id === entry.accountId);
        if (!account) return;

        const accountCurrency = (account.currency || "GBP") as Currency;

        // Add work income to total (raw)
        totalWorkIncome += Number(entry.workIncome || 0);

        // Calculate savings from income (cash flow)
        if (entry.cashFlow !== 0) {
          savingsFromIncome += entry.cashFlow;
          savingsAccounts.push({
            accountId: account.id,
            name: account.name,
            type: account.type,
            amount: entry.cashFlow,
            currency: accountCurrency,
            owner: account.owner || "Unknown",
          });
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
        "Savings Rate":
          totalWorkIncome > 0
            ? Number(
                ((Math.abs(savingsFromIncome) / totalWorkIncome) * 100).toFixed(
                  1
                )
              )
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
  timePeriod: "YTD" | "1Y" | "all"
): string[] {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  switch (timePeriod) {
    case "YTD":
      return months.filter((month) => month.startsWith(currentYear.toString()));
    case "1Y":
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(currentYear - 1);
      return months.filter((month) => new Date(month + "-01") >= oneYearAgo);
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
      const cashFlow =
        Number(entry.cashIn) -
        Number(entry.cashOut) +
        Number(entry.workIncome || 0);
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
        workIncome: Number(entry.workIncome || 0),
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
      "Work Income",
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
      const cashFlow =
        Number(entry.cashIn) -
        Number(entry.cashOut) +
        Number(entry.workIncome || 0);

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
        Number(entry.workIncome || 0).toFixed(2),
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
    const userId = await getUserId();
    if (!userId) {
      return [];
    }

    const scenarios = await db
      .select()
      .from(projectionScenarios)
      .where(eq(projectionScenarios.userId, userId))
      .orderBy(desc(projectionScenarios.createdAt));

    return scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      monthlyIncome: Number(scenario.monthlyIncome),
      savingsRate: Number(scenario.savingsRate),
      timePeriodMonths: scenario.timePeriodMonths,
      growthRates: scenario.growthRates as Record<AccountType, number>,
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
}) {
  try {
    // Get all accounts (excluding closed and liabilities)
    const allAccounts = await db.select().from(accountsTable);
    const activeAccounts = allAccounts.filter(
      (account) =>
        !account.isClosed &&
        account.type !== "Credit_Card" &&
        account.type !== "Loan"
    );

    // Get the latest monthly entries for each account
    const latestEntries = await db
      .select()
      .from(monthlyEntries)
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
    // For now, distribute proportionally based on current balances
    const totalBalance = Array.from(currentBalances.values()).reduce(
      (sum, balance) => sum + balance,
      0
    );

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

    if (totalBalance > 0) {
      activeAccounts.forEach((account) => {
        const balance = currentBalances.get(account.id) || 0;
        const proportion = balance / totalBalance;
        savingsDistribution.set(account.id, monthlySavings * proportion);
      });
    } else {
      // If no balances, distribute evenly
      const perAccount =
        activeAccounts.length > 0 ? monthlySavings / activeAccounts.length : 0;
      activeAccounts.forEach((account) => {
        savingsDistribution.set(account.id, perAccount);
      });
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
    return {
      currentNetWorth: 0,
      finalNetWorth: 0,
      totalGrowth: 0,
      growthPercentage: 0,
      projectionData: [],
    };
  }
}
