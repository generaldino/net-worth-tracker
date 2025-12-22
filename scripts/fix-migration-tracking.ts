import postgres from "postgres";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { createHash } from "crypto";

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
  console.error(
    "   Please set it in your .env.local file or as an environment variable."
  );
  process.exit(1);
}

const client = postgres(process.env.POSTGRES_URL!);

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface MigrationRecord {
  id: number;
  hash: string;
  created_at: number;
}

async function getMigrationHash(migrationFile: string): Promise<string | null> {
  try {
    const filePath = join(process.cwd(), "supabase/migrations", migrationFile);
    const content = readFileSync(filePath, "utf-8");
    return createHash("sha256").update(content).digest("hex");
  } catch (error) {
    console.error(`⚠️  Could not read migration file: ${migrationFile}`);
    return null;
  }
}

async function fixMigrationTracking() {
  try {
    console.log("🔗 Connecting to database...");

    // Read the journal
    const journalPath = join(
      process.cwd(),
      "supabase/migrations/meta/_journal.json"
    );
    const journal = JSON.parse(readFileSync(journalPath, "utf-8"));
    const entries: JournalEntry[] = journal.entries;

    console.log(`\n📋 Found ${entries.length} migrations in journal\n`);

    // Check what's currently in the database
    // First, check if the table exists
    const tableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'drizzle' 
        AND table_name = '__drizzle_migrations'
      )
    `;

    if (!tableExists[0]?.exists) {
      console.log("⚠️  Migration tracking table doesn't exist yet.");
      console.log("   It will be created when you run the first migration.\n");
      await client.end();
      return;
    }

    const existingMigrations = await client<MigrationRecord[]>`
      SELECT id, hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY id ASC
    `;

    console.log(
      `📊 Found ${existingMigrations.length} migrations in database\n`
    );

    // Get list of migration files
    const migrationFiles = entries.map((entry) => `${entry.tag}.sql`);

    // Check which migrations are missing
    const missingMigrations: Array<{
      file: string;
      entry: JournalEntry;
      hash: string;
    }> = [];

    for (const entry of entries) {
      const fileName = `${entry.tag}.sql`;
      const hash = await getMigrationHash(fileName);

      if (!hash) {
        console.log(`⚠️  Skipping: ${fileName} (file not found)`);
        continue;
      }

      // Check if this migration exists in the database
      const exists = existingMigrations.some((m) => m.hash === hash);

      if (!exists) {
        missingMigrations.push({
          file: fileName,
          entry,
          hash,
        });
        console.log(`⚠️  Missing: ${fileName}`);
      } else {
        console.log(`✓ Found: ${fileName}`);
      }
    }

    if (missingMigrations.length === 0) {
      console.log("\n✅ All migrations are already tracked!");
      await client.end();
      return;
    }

    console.log(
      `\n🔧 Inserting ${missingMigrations.length} missing migration records...\n`
    );

    // Insert missing migrations
    for (const { file, entry, hash } of missingMigrations) {
      try {
        // Check if hash already exists (in case of duplicates)
        const existing = await client`
          SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${hash}
        `;

        if (existing.length > 0) {
          console.log(`⚠️  Skipped: ${file} (already exists with different entry)`);
          continue;
        }

        // Insert the migration record
        await client`
          INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
          VALUES (${hash}, ${entry.when})
        `;
        console.log(`✅ Inserted: ${file}`);
      } catch (error) {
        console.error(`❌ Failed to insert ${file}:`, error);
        if (error instanceof Error && error.message.includes("duplicate")) {
          console.log(`   (Migration already exists, skipping)`);
        }
      }
    }

    console.log("\n✅ Migration tracking fixed!");
    console.log(
      "\n💡 You can now run: npm run db:generate (if needed) and npx drizzle-kit migrate"
    );
  } catch (error) {
    console.error("\n❌ Error fixing migration tracking:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  } finally {
    await client.end();
  }
}

fixMigrationTracking();

