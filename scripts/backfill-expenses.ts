/**
 * Backfill historic spend into the expenses table.
 *
 * Before the budget module, spending was stored per account per month in
 * monthly_entries.expenditure (Current + Credit_Card accounts). This script
 * collapses that history into the expenses table as ONE row per
 * (user, month, currency), uncategorised, dated month-end — so past months keep
 * correct totals and savings rate without any manual categorisation work.
 *
 * Guards against double counting: any month that already has expense rows for
 * a user is skipped entirely. Safe to re-run.
 *
 * Run with: npm run backfill:expenses
 * Make sure POSTGRES_URL is set in your .env.local file.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, inArray } from "drizzle-orm";
import {
  financialAccounts as accountsTable,
  monthlyEntries,
  expenses,
} from "@/db/schema";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env.local or .env
function loadEnv() {
  const envPaths = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
  ];

  for (const envPath of envPaths) {
    try {
      const envFile = readFileSync(envPath, "utf-8");
      const lines = envFile.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          if (key && valueParts.length > 0) {
            const value = valueParts.join("=").replace(/^["']|["']$/g, "");
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
      console.log(`✓ Loaded environment from ${envPath}`);
      break;
    } catch {
      // File doesn't exist, continue
    }
  }
}

loadEnv();

if (!process.env.POSTGRES_URL) {
  console.error("❌ Error: POSTGRES_URL environment variable is not set!");
  process.exit(1);
}

const client = postgres(process.env.POSTGRES_URL);
const db = drizzle({ client });

/** Last calendar day of a "YYYY-MM" month, as "YYYY-MM-DD". */
function monthEnd(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon, 0)).toISOString().slice(0, 10);
}

async function main() {
  // Historic spend: Current + Credit_Card monthly entries, with their owner.
  const rows = await db
    .select({
      userId: accountsTable.userId,
      currency: accountsTable.currency,
      accountType: accountsTable.type,
      month: monthlyEntries.month,
      expenditure: monthlyEntries.expenditure,
    })
    .from(monthlyEntries)
    .innerJoin(accountsTable, eq(monthlyEntries.accountId, accountsTable.id))
    .where(inArray(accountsTable.type, ["Current", "Credit_Card"]));

  // Sum by user + month + currency.
  const totals = new Map<
    string,
    { userId: string; month: string; currency: string; amount: number }
  >();

  for (const row of rows) {
    const amount = Number(row.expenditure ?? 0);
    if (amount <= 0) continue;
    const currency = row.currency ?? "GBP";
    const key = `${row.userId}|${row.month}|${currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.amount += amount;
    } else {
      totals.set(key, {
        userId: row.userId,
        month: row.month,
        currency,
        amount,
      });
    }
  }

  if (totals.size === 0) {
    console.log("Nothing to backfill — no historic expenditure found.");
    await client.end();
    return;
  }

  // Months that already have expense rows are skipped wholesale, so importing a
  // statement for a month can never be double counted by a later backfill run.
  const existing = await db
    .select({ userId: expenses.userId, month: expenses.month })
    .from(expenses);
  const occupied = new Set(existing.map((e) => `${e.userId}|${e.month}`));

  let created = 0;
  let skipped = 0;

  for (const entry of totals.values()) {
    if (occupied.has(`${entry.userId}|${entry.month}`)) {
      skipped += 1;
      continue;
    }

    await db.insert(expenses).values({
      userId: entry.userId,
      date: monthEnd(entry.month),
      month: entry.month,
      amount: entry.amount.toString(),
      currency: entry.currency as "GBP" | "EUR" | "USD" | "AED",
      description: "Historic spending",
      merchant: null,
      categoryId: null,
      accountId: null,
      source: "backfill",
      dedupeHash: null,
    });
    created += 1;
  }

  console.log(
    `✓ Backfill complete. Created ${created} monthly expense row(s), skipped ${skipped} month(s) that already had expenses.`,
  );
  await client.end();
}

main().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
