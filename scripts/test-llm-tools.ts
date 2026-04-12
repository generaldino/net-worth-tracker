/**
 * Phase 2 unit test for the AI Assistant tools.
 * Run with: npm run test:llm-tools
 *
 * Calls each tool's execute() directly against the real database using the
 * dev auth bypass (DEV_USER_ID in .env + NODE_ENV=development).
 *
 * NOTE: this script uses dynamic imports. ES module imports are hoisted,
 * so we MUST load .env and set NODE_ENV *before* importing anything that
 * transitively pulls in lib/auth.ts — otherwise the dev bypass captures
 * DEV_USER_ID=undefined at module load and real NextAuth kicks in.
 */

(process.env as Record<string, string>).NODE_ENV = "development";

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

function banner(title: string) {
  console.log(`\n${"=".repeat(60)}\n${title}\n${"=".repeat(60)}`);
}

async function main() {
  if (!process.env.DEV_USER_ID) {
    console.error("❌ DEV_USER_ID must be set in .env for the test script.");
    process.exit(1);
  }

  // Dynamic imports — deferred until after env is set up.
  const { buildTools } = await import("@/lib/llm/tools");
  type Currency = "GBP" | "EUR" | "USD" | "AED";

  const currency: Currency = (process.argv[2] as Currency) ?? "GBP";
  console.log(`→ Testing tools with displayCurrency=${currency}`);
  console.log(`→ Impersonating DEV_USER_ID=${process.env.DEV_USER_ID}`);
  console.log(`→ NODE_ENV=${process.env.NODE_ENV}`);

  const tools = buildTools({ displayCurrency: currency });

  banner("list_accounts (excluding closed)");
  const accountsRes = await tools.list_accounts.execute!(
    { includeClosed: false },
    { toolCallId: "test-1", messages: [] },
  );
  console.log(JSON.stringify(accountsRes, null, 2));

  banner("get_net_worth_summary");
  const netWorthRes = await tools.get_net_worth_summary.execute!(
    {},
    { toolCallId: "test-2", messages: [] },
  );
  console.log(JSON.stringify(netWorthRes, null, 2));

  // Pick the previous calendar month — most likely to have data.
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

  banner(`get_monthly_metrics (${monthStr})`);
  const metricsRes = await tools.get_monthly_metrics.execute!(
    { month: monthStr },
    { toolCallId: "test-3", messages: [] },
  );
  console.log(JSON.stringify(metricsRes, null, 2));

  console.log("\n✅ All tools executed without throwing.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Tool test failed:", err);
  process.exit(1);
});
