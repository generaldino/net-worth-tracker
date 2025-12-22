# Fix Migration Tracking

This guide will help you fix the drizzle-kit migration tracking issue.

## Problem

The migration tracking table (`drizzle.__drizzle_migrations`) is out of sync with your migration files. This happens when:
- Migrations were applied manually
- Migrations were applied outside of drizzle-kit
- The migration journal was modified

## Solution

Run the fix script:

```bash
npm run db:fix-migrations
```

This script will:
1. Read all migrations from your `supabase/migrations/meta/_journal.json`
2. Check which migrations are already tracked in the database
3. Insert missing migration records into `drizzle.__drizzle_migrations`

## After Running the Script

Once the script completes successfully, you can:

1. **Apply the new projection_scenarios migration:**
   ```bash
   npx drizzle-kit migrate
   ```

2. **Or if you prefer to apply it manually**, run the SQL from `apply-projection-migration.sql` in your Supabase SQL editor.

## Manual Alternative

If the script doesn't work, you can manually insert migration records. The `__drizzle_migrations` table has this structure:
- `id` (serial)
- `hash` (text, unique) - SHA256 hash of the migration file
- `created_at` (bigint) - Timestamp from the journal entry

You can calculate the hash of a migration file and insert it manually if needed.

