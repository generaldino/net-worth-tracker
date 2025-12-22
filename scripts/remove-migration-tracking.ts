import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve, join } from "path";
import { createHash } from "crypto";

// Load environment variables
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

async function removeMigrationTracking() {
  try {
    console.log("🔗 Connecting to database...\n");

    // Get the hash of the migration file we want to remove
    const migrationFile = "0008_oval_chronomancer.sql";
    const filePath = join(process.cwd(), "supabase/migrations", migrationFile);
    const content = readFileSync(filePath, "utf-8");
    const hash = createHash("sha256").update(content).digest("hex");

    console.log(`📋 Looking for migration: ${migrationFile}`);
    console.log(`   Hash: ${hash}\n`);

    // Check if it exists
    const existing = await client`
      SELECT id, hash, created_at 
      FROM drizzle.__drizzle_migrations 
      WHERE hash = ${hash}
    `;

    if (existing.length === 0) {
      console.log("⚠️  Migration not found in tracking table");
      await client.end();
      return;
    }

    console.log(`✅ Found migration in tracking table`);
    console.log(`   Removing tracking entry...\n`);

    // Remove the tracking entry
    await client`
      DELETE FROM drizzle.__drizzle_migrations 
      WHERE hash = ${hash}
    `;

    console.log("✅ Removed migration tracking entry");
    console.log("\n💡 Now run: npx drizzle-kit migrate");
    console.log("   This will apply the migration SQL to create the table.");
  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    await client.end();
  }
}

removeMigrationTracking();

