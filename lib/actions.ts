"use server";

import { db } from "@/db";
import { accounts as accountsTable, monthlyEntries } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import type { Account, MonthlyEntry } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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
    const netWorth = allAccounts.reduce((total: number, account: Account) => {
      const latestEntry = latestEntries.find(
        (entry: MonthlyEntry) => entry.accountId === account.id
      );
      return total + Number(latestEntry?.endingBalance || 0);
    }, 0);

    return netWorth;
  } catch (error) {
    console.error("Error calculating net worth:", error);
    return 0;
  }
}

export async function getAccounts(includeClosed: boolean = false) {
  try {
    const query = db
      .select()
      .from(accountsTable)
      .orderBy(accountsTable.createdAt);

    // If not including closed accounts, filter them out
    if (!includeClosed) {
      query.where(eq(accountsTable.isClosed, false));
    }

    const dbAccounts = await query;

    // Transform the data to match the client-side Account type
    return dbAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      isISA: account.isISA,
      owner: account.owner,
      category: account.category,
      isClosed: account.isClosed,
      closedAt: account.closedAt,
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
    | "Stock_options";
  isISA: boolean;
  owner: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const [account] = await db
      .insert(accountsTable)
      .values({
        name: data.name,
        type: data.type,
        isISA: data.isISA,
        owner: data.owner,
        userId: session.user.id,
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
    | "Stock_options";
  category: "Cash" | "Investments";
  isISA: boolean;
  owner: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
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
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
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

    // Calculate net worth over time
    const netWorthData = filteredMonths.map((month) => ({
      month: new Date(month + "-01").toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
      netWorth: monthlyData[month]
        .filter((entry) =>
          filteredAccounts.some((account) => account.id === entry.accountId)
        )
        .reduce((sum, entry) => sum + entry.endingBalance, 0),
    }));

    // Calculate net worth by account over time
    const accountData = filteredMonths.map((month) => {
      const monthData: {
        month: string;
        [key: string]: number | string;
      } = {
        month: new Date(month + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        }),
      };

      monthlyData[month].forEach((entry) => {
        const account = filteredAccounts.find((a) => a.id === entry.accountId);
        if (account) {
          // Create a unique name by combining account name, type, and ISA status
          const uniqueName = `${account.name} (${account.type}${
            account.isISA ? " ISA" : ""
          })`;
          monthData[uniqueName] = entry.endingBalance;
        }
      });

      return monthData;
    });

    // Calculate net worth by account type over time
    const accountTypeData = filteredMonths.map((month) => {
      const monthData: {
        month: string;
        [key: string]: number | string;
      } = {
        month: new Date(month + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        }),
      };

      // Group accounts by type
      const accountsByType = filteredAccounts.reduce((acc, account) => {
        if (!acc[account.type]) {
          acc[account.type] = [];
        }
        acc[account.type].push(account);
        return acc;
      }, {} as Record<string, typeof filteredAccounts>);

      // Calculate total for each account type
      Object.entries(accountsByType).forEach(([type, accounts]) => {
        monthData[type] = accounts.reduce((sum, account) => {
          const entry = monthlyData[month].find(
            (e) => e.accountId === account.id
          );
          return sum + (entry?.endingBalance || 0);
        }, 0);
      });

      return monthData;
    });

    // Calculate net worth by category over time
    const categoryData = filteredMonths.map((month) => {
      const monthData: {
        month: string;
        [key: string]: number | string;
      } = {
        month: new Date(month + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        }),
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

      // Calculate total for each category
      Object.entries(accountsByCategory).forEach(([category, accounts]) => {
        monthData[category] = accounts.reduce((sum, account) => {
          const entry = monthlyData[month].find(
            (e) => e.accountId === account.id
          );
          return sum + (entry?.endingBalance || 0);
        }, 0);
      });

      return monthData;
    });

    // Calculate growth by source over time
    const sourceData = filteredMonths.map((month) => {
      let savingsFromIncome = 0;
      let interestEarned = 0;
      let capitalGains = 0;
      let totalWorkIncome = 0;

      // Per-account breakdowns
      const savingsAccounts: Array<{
        accountId: string;
        name: string;
        type: string;
        amount: number;
        owner: string;
      }> = [];
      const interestAccounts: Array<{
        accountId: string;
        name: string;
        type: string;
        amount: number;
        owner: string;
      }> = [];
      const capitalGainsAccounts: Array<{
        accountId: string;
        name: string;
        type: string;
        amount: number;
        owner: string;
      }> = [];

      monthlyData[month].forEach((entry) => {
        const account = filteredAccounts.find((a) => a.id === entry.accountId);
        if (!account) return;

        // Add work income to total
        totalWorkIncome += Number(entry.workIncome || 0);

        // Calculate savings from income (cash flow)
        if (entry.cashFlow !== 0) {
          savingsFromIncome += entry.cashFlow;
          savingsAccounts.push({
            accountId: account.id,
            name: account.name,
            type: account.type,
            amount: entry.cashFlow,
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
            owner: account.owner || "Unknown",
          });
        }
      });

      return {
        month: new Date(month + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        }),
        "Savings from Income": savingsFromIncome,
        "Interest Earned": interestEarned,
        "Capital Gains": capitalGains,
        "Savings Rate":
          totalWorkIncome > 0 ? (savingsFromIncome / totalWorkIncome) * 100 : 0,
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
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
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
    const dbAccounts = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.isClosed, true))
      .orderBy(accountsTable.closedAt);

    return dbAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      isISA: account.isISA,
      owner: account.owner,
      category: account.category,
      isClosed: account.isClosed,
      closedAt: account.closedAt,
    }));
  } catch (error) {
    console.error("Error fetching closed accounts:", error);
    return [];
  }
}
