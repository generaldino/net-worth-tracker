"use server";

import { db } from "@/db";
import { accounts as accountsTable, monthlyEntries } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import type { Account, MonthlyEntry } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";

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

    return { success: true, account };
  } catch (error) {
    console.error("Error updating account:", error);
    return { success: false, error: "Failed to update account" };
  }
}
