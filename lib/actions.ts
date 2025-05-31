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

export async function getAccounts() {
  try {
    const dbAccounts = await db
      .select()
      .from(accountsTable)
      .orderBy(accountsTable.createdAt);

    // Transform the data to match the client-side Account type
    return dbAccounts.map((account) => ({
      id: account.id, // Keep as UUID string, don't convert to string
      name: account.name,
      type: account.type,
      isISA: account.isISA,
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
    const monthlyData: Record<string, any[]> = {};

    // First pass: organize entries by month
    entries.forEach((entry) => {
      const month = entry.month;
      if (!monthlyData[month]) {
        monthlyData[month] = [];
      }

      const cashFlow = Number(entry.cashIn) - Number(entry.cashOut);
      monthlyData[month].push({
        accountId: entry.accountId,
        monthKey: month,
        month: month,
        endingBalance: Number(entry.endingBalance),
        cashIn: Number(entry.cashIn),
        cashOut: Number(entry.cashOut),
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
  type: "current" | "savings" | "investment";
  isISA: boolean;
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
  type: "current" | "savings" | "investment";
  isISA: boolean;
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
        isISA: data.isISA,
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

export async function getChartData(timePeriod: "YTD" | "1Y" | "all") {
  try {
    // Get all monthly entries ordered by month (desc)
    const entries = await db
      .select()
      .from(monthlyEntries)
      .orderBy(desc(monthlyEntries.month));

    // Get all accounts
    const accounts = await db.select().from(accountsTable);

    // Transform the data into the required format
    const monthlyData: Record<string, any[]> = {};

    // First pass: organize entries by month
    entries.forEach((entry) => {
      const month = entry.month;
      if (!monthlyData[month]) {
        monthlyData[month] = [];
      }

      const cashFlow = Number(entry.cashIn) - Number(entry.cashOut);
      monthlyData[month].push({
        accountId: entry.accountId,
        monthKey: month,
        month: month,
        endingBalance: Number(entry.endingBalance),
        cashIn: Number(entry.cashIn),
        cashOut: Number(entry.cashOut),
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

    // Filter months based on timePeriod
    const filteredMonths = getFilteredMonths(months, timePeriod);
    const filteredData = Object.fromEntries(
      filteredMonths.map((month) => [month, monthlyData[month]])
    );

    // Calculate net worth over time
    const netWorthData = filteredMonths.map((month) => ({
      month: new Date(month + "-01").toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
      netWorth: monthlyData[month].reduce(
        (sum, entry) => sum + entry.endingBalance,
        0
      ),
    }));

    // Calculate net worth by account over time
    const accountData = filteredMonths.map((month) => {
      const monthData: any = {
        month: new Date(month + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        }),
      };

      monthlyData[month].forEach((entry) => {
        const account = accounts.find((a) => a.id === entry.accountId);
        if (account) {
          monthData[account.name] = entry.endingBalance;
        }
      });

      return monthData;
    });

    // Calculate growth by source over time
    const sourceData = filteredMonths.map((month) => {
      let savingsFromIncome = 0;
      let interestEarned = 0;
      let capitalGains = 0;

      monthlyData[month].forEach((entry) => {
        const account = accounts.find((a) => a.id === entry.accountId);
        if (!account) return;

        switch (account.type) {
          case "current":
            savingsFromIncome += entry.accountGrowth;
            break;
          case "savings":
            interestEarned += entry.accountGrowth;
            break;
          case "investment":
            capitalGains += entry.accountGrowth;
            break;
        }
      });

      return {
        month: new Date(month + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        }),
        "Savings from Income": Math.max(0, savingsFromIncome),
        "Interest Earned": Math.max(0, interestEarned),
        "Capital Gains": capitalGains,
      };
    });

    return {
      netWorthData,
      accountData,
      sourceData,
      accounts: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        isISA: account.isISA,
      })),
    };
  } catch (error) {
    console.error("Error getting chart data:", error);
    return {
      netWorthData: [],
      accountData: [],
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
