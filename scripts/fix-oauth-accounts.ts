#!/usr/bin/env tsx

/**
 * Fix OAuth Account Linking
 *
 * Removes incorrectly created OAuth accounts so users can sign in fresh.
 * NextAuth will automatically create the correct OAuth links when users
 * sign in with Google.
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function main() {
  const neonUrl = process.env.POSTGRES_URL;

  if (!neonUrl) {
    console.error('❌ Error: POSTGRES_URL not found in .env');
    process.exit(1);
  }

  const client = new Client({ connectionString: neonUrl });

  try {
    await client.connect();
    console.log('✅ Connected to Neon database\n');

    // Delete incorrectly created OAuth accounts
    console.log('🔧 Removing incorrect OAuth account links...');

    const result = await client.query(`
      DELETE FROM next_auth_accounts
      WHERE provider = 'google'
      RETURNING "userId"
    `);

    console.log(`✅ Removed ${result.rowCount} OAuth account links\n`);

    // Verify users still exist
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log(`✅ Users table still has ${userCount.rows[0].count} users\n`);

    console.log('=' .repeat(80));
    console.log('✅ Fix Complete!');
    console.log('=' .repeat(80));
    console.log('\nNext steps:');
    console.log('1. Go to http://localhost:3000');
    console.log('2. Click "Sign in with Google"');
    console.log('3. Sign in with your Google account');
    console.log('4. NextAuth will automatically link your account correctly\n');
    console.log('Note: You may need to restart your dev server if it\'s cached.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
