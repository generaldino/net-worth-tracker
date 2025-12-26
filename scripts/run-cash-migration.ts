import { readFileSync } from "fs";
import { join, resolve } from "path";
import postgres from "postgres";

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
  console.error("❌ POSTGRES_URL environment variable is not set!");
  process.exit(1);
}

const client = postgres(process.env.POSTGRES_URL!);

async function runCashMigration() {
  try {
    console.log("🔗 Connecting to database...\n");

    // Read the migration SQL file
    const migrationFile = join(
      process.cwd(),
      "supabase/migrations/0011_backdate_cash_in_out.sql"
    );
    const sql = readFileSync(migrationFile, "utf-8");

    console.log("📋 Running migration: 0011_backdate_cash_in_out.sql\n");
    console.log("SQL to execute:");
    console.log("─".repeat(50));
    console.log(sql);
    console.log("─".repeat(50));
    console.log();

    // Execute the SQL
    await client.unsafe(sql);

    console.log("✅ Migration completed successfully!");
    console.log("\n📊 Summary:");
    console.log("   - Updated cashIn to include income for all entries");
    console.log("   - Updated cashOut to include expenditure for all entries");
    console.log("\n💡 Your data model has been updated!");
    console.log(
      "   Going forward, enter total Cash In/Out (including income/expenditure)"
    );
  } catch (error) {
    console.error("\n❌ Error running migration:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runCashMigration();

