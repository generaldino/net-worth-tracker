/**
 * Backfill income streams from historical per-account income.
 *
 * Before this change, income was recorded on each Current account's monthly
 * entry (monthly_entries.income). Income now lives in a decoupled income_streams
 * table. This script converts every historical Current-account income value
 * into an equivalent income stream so metrics and charts stay continuous across
 * the cutover.
 *
 * For each monthly_entries row on a Current account with income > 0, it creates
 * one income_streams row:
 *   { userId (from the account), month, name: "Salary — <account>", amount, currency }
 *
 * It is idempotent per (userId, month, name): existing rows with the same key
 * are skipped, so it can be re-run safely.
 *
 * Run with: npm run tsx scripts/backfill-income-streams.ts
 * Make sure POSTGRES_URL is set in your .env.local file.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import {
  financialAccounts as accountsTable,
  monthlyEntries,
  incomeStreams,
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

async function main() {
  // Every Current-account monthly entry with income, joined to its account.
  const rows = await db
    .select({
      userId: accountsTable.userId,
      accountName: accountsTable.name,
      currency: accountsTable.currency,
      month: monthlyEntries.month,
      income: monthlyEntries.income,
    })
    .from(monthlyEntries)
    .innerJoin(accountsTable, eq(monthlyEntries.accountId, accountsTable.id))
    .where(eq(accountsTable.type, "Current"));

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const amount = Number(row.income ?? 0);
    if (amount <= 0) continue;

    const name = `Salary — ${row.accountName}`;

    // Idempotency: skip if a stream with this key already exists.
    const existing = await db
      .select({ id: incomeStreams.id })
      .from(incomeStreams)
      .where(
        and(
          eq(incomeStreams.userId, row.userId),
          eq(incomeStreams.month, row.month),
          eq(incomeStreams.name, name),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      skipped += 1;
      continue;
    }

    await db.insert(incomeStreams).values({
      userId: row.userId,
      month: row.month,
      name,
      amount: amount.toString(),
      currency: row.currency ?? "GBP",
    });
    created += 1;
  }

  console.log(
    `✓ Backfill complete. Created ${created} income stream(s), skipped ${skipped} existing.`,
  );
  await client.end();
}

main().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
