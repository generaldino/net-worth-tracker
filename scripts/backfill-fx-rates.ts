/**
 * Script to backfill historical FX rates from Nov 2024 to Nov 2025
 * Run with: npm run backfill:fx-rates
 *
 * Make sure POSTGRES_URL is set in your .env.local file
 * You can get it from your Supabase project settings -> Database -> Connection string
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { exchangeRates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { resolve } from "path";
import https from "https";

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
  console.error("\nPlease set POSTGRES_URL in your .env.local file.");
  console.error("You can find it in Supabase:");
  console.error("  1. Go to your Supabase project");
  console.error("  2. Project Settings -> Database");
  console.error("  3. Copy the 'Connection string' (use the 'URI' format)");
  console.error(
    "  4. Add it to .env.local as: POSTGRES_URL=your-connection-string"
  );
  process.exit(1);
}

// Create database connection
const client = postgres(process.env.POSTGRES_URL);
const db = drizzle({ client });

const HEXARATE_API_URL = "https://hexarate.paikama.co";

interface HexaRateResponse {
  base: string;
  rates: {
    EUR?: number;
    USD?: number;
    AED?: number;
    GBP?: number;
  };
  date?: string;
}

/**
 * Get the last day of a month
 */
function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0);
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Fetch a single currency pair rate for a specific date from HexaRate
 * Format: https://api.hexarate.paikama.co/api/rates/{base}/{target}/{date}
 */
async function fetchCurrencyPairRate(
  base: string,
  target: string,
  date: string
): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      // HexaRate API format: /api/rates/{base}/{target}/{date}
      const url = `${HEXARATE_API_URL}/api/rates/${base}/${target}/${date}`;
      console.log(`    📡 Fetching ${base}/${target}: ${url}`);

      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "curl/7.68.0",
          Connection: "close",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const jsonData: any = JSON.parse(data);
              // HexaRate returns: { status_code: 200, data: { base: "GBP", target: "EUR", mid: 1.15, ... } }
              const rate =
                jsonData.data?.mid || jsonData.mid || jsonData.rate || null;
              if (rate) {
                console.log(`    ✅ ${base}/${target}: ${rate}`);
                resolve(rate);
              } else {
                console.warn(
                  `    ⚠️  No rate found in response for ${base}/${target}`
                );
                console.warn(`    📄 Response:`, data.substring(0, 200));
                resolve(null);
              }
            } catch (parseError) {
              console.error(
                `    ❌ Error parsing response for ${base}/${target}:`,
                parseError
              );
              console.error(`    📄 Raw response:`, data.substring(0, 500));
              resolve(null);
            }
          } else {
            console.warn(
              `    ⚠️  HTTP error for ${base}/${target}: ${res.statusCode} ${res.statusMessage}`
            );
            resolve(null);
          }
        });
      });

      req.on("error", (error) => {
        console.error(
          `    ❌ Request error for ${base}/${target}:`,
          error.message
        );
        resolve(null);
      });

      req.on("timeout", () => {
        req.destroy();
        console.error(`    ⏱️  Timeout for ${base}/${target} (30s)`);
        resolve(null);
      });

      req.setTimeout(30000); // 30 seconds

      req.end();
    } catch (error) {
      console.error(
        `    ❌ Error setting up request for ${base}/${target}:`,
        error
      );
      resolve(null);
    }
  });
}

/**
 * Fetch exchange rate for a specific date from HexaRate
 * Fetches rates for EUR, USD, and AED relative to GBP
 * Fetches sequentially with delays to avoid rate limiting
 */
async function fetchExchangeRateForDate(date: string): Promise<{
  eurRate: number;
  usdRate: number;
  aedRate: number;
} | null> {
  console.log(`  🔍 Fetching rates for ${date}...`);

  // Fetch each currency pair sequentially with delays to avoid overwhelming the API
  const eurRate = await fetchCurrencyPairRate("GBP", "EUR", date);
  await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay

  const usdRate = await fetchCurrencyPairRate("GBP", "USD", date);
  await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay

  const aedRate = await fetchCurrencyPairRate("GBP", "AED", date);

  if (eurRate && usdRate && aedRate) {
    return {
      eurRate,
      usdRate,
      aedRate,
    };
  }

  console.warn(`  ⚠️  Some rates failed to fetch for ${date}`);
  return null;
}

/**
 * Backfill FX rates for a date range
 */
async function backfillFxRates(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
) {
  console.log(
    `Starting backfill from ${startYear}-${startMonth} to ${endYear}-${endMonth}`
  );

  const ratesToInsert: Array<{
    date: string;
    baseCurrency: "GBP";
    gbpRate: string;
    eurRate: string;
    usdRate: string;
    aedRate: string;
  }> = [];

  // Iterate through each month
  let currentYear = startYear;
  let currentMonth = startMonth;

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const lastDay = getLastDayOfMonth(currentYear, currentMonth);
    const dateStr = formatDate(lastDay);

    // Check if rate already exists
    const existing = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.date, dateStr))
      .limit(1);

    if (existing.length > 0) {
      console.log(`Rate for ${dateStr} already exists, skipping...`);
    } else {
      console.log(`Fetching rate for ${dateStr}...`);
      const rates = await fetchExchangeRateForDate(dateStr);

      if (rates) {
        ratesToInsert.push({
          date: dateStr,
          baseCurrency: "GBP",
          gbpRate: "1",
          eurRate: rates.eurRate.toString(),
          usdRate: rates.usdRate.toString(),
          aedRate: rates.aedRate.toString(),
        });
        console.log(
          `✓ Fetched rates for ${dateStr}: EUR=${rates.eurRate}, USD=${rates.usdRate}, AED=${rates.aedRate}`
        );
      } else {
        console.warn(`✗ Failed to fetch rates for ${dateStr}`);
      }

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Move to next month
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  // Insert all rates in batch
  if (ratesToInsert.length > 0) {
    console.log(`\nInserting ${ratesToInsert.length} exchange rates...`);
    await db.insert(exchangeRates).values(ratesToInsert);
    console.log(
      `✓ Successfully inserted ${ratesToInsert.length} exchange rates`
    );
  } else {
    console.log("\nNo new rates to insert.");
  }

  console.log("\nBackfill complete!");
}

// Run the backfill
async function main() {
  try {
    console.log("🔗 Connecting to database...");
    // Test connection
    await db.select().from(exchangeRates).limit(1);
    console.log("✓ Database connection successful\n");

    // Backfill from November 2024 to November 2025
    await backfillFxRates(2024, 11, 2025, 11);

    // Close database connection
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during backfill:", error);
    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      console.error(
        "\n💡 Tip: Make sure POSTGRES_URL is set correctly in your .env.local file"
      );
      console.error(
        "   Get your connection string from Supabase: Project Settings -> Database"
      );
    }
    await client.end().catch(() => {});
    process.exit(1);
  }
}

main();
