"use server";

import { db } from "@/db";
import { accounts, monthlyEntries } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import type { InferModel } from "drizzle-orm";

type Account = InferModel<typeof accounts>;
type MonthlyEntry = InferModel<typeof monthlyEntries>;

export async function calculateNetWorth() {
  try {
    // Get all accounts
    const allAccounts = await db.select().from(accounts);

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
