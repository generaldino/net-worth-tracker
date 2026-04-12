import { asc, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  financialAccounts as accountsTable,
  monthlyEntries,
} from "@/db/schema";
import { getAccessibleUserIds } from "@/app/actions/sharing";

/**
 * Build the system prompt for the AI assistant.
 *
 * Currency- and masking-agnostic per spec §7: money formatting is handled
 * entirely in the tools (each monetary field returns `{ value, formatted }`)
 * and masking is applied at render time on the client. The prompt only
 * describes the user's data surface and the rules for calling tools.
 *
 * The stable section (role, rules, schema) is emitted first so that
 * Anthropic prompt caching can cover as much of it as possible.
 * The only turn-to-turn variation is today's date, which lives at the end.
 */
export async function buildSystemPrompt(): Promise<string> {
  const accessibleUserIds = await getAccessibleUserIds();

  // Small parallel fetch: live account list + the earliest/latest month range.
  const [accounts, [earliest], [latest]] = await Promise.all([
    accessibleUserIds.length > 0
      ? db
          .select({
            name: accountsTable.name,
            type: accountsTable.type,
            currency: accountsTable.currency,
            isClosed: accountsTable.isClosed,
          })
          .from(accountsTable)
          .where(inArray(accountsTable.userId, accessibleUserIds))
          .orderBy(asc(accountsTable.displayOrder))
      : Promise.resolve([]),
    accessibleUserIds.length > 0
      ? db
          .select({ month: monthlyEntries.month })
          .from(monthlyEntries)
          .innerJoin(
            accountsTable,
            inArray(accountsTable.userId, accessibleUserIds),
          )
          .orderBy(asc(monthlyEntries.month))
          .limit(1)
      : Promise.resolve([]),
    accessibleUserIds.length > 0
      ? db
          .select({ month: monthlyEntries.month })
          .from(monthlyEntries)
          .innerJoin(
            accountsTable,
            inArray(accountsTable.userId, accessibleUserIds),
          )
          .orderBy(desc(monthlyEntries.month))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const openAccounts = accounts.filter((a) => !a.isClosed);
  const accountLines = openAccounts
    .map((a) => `  - ${a.name} (${a.type}, ${a.currency})`)
    .join("\n");
  const closedCount = accounts.length - openAccounts.length;
  const monthRange =
    earliest && latest
      ? `${earliest.month} to ${latest.month}`
      : "no monthly entries yet";

  const today = new Date().toISOString().slice(0, 10);

  return `You are a personal finance assistant. Your job is to answer questions about a single user's net worth, income, spending, and savings, using only the tools provided. Do not make up numbers. If a tool returns no data for a period, say so plainly.

## The user's data

- Open accounts:
${accountLines || "  (none)"}${closedCount > 0 ? `\n- Closed accounts: ${closedCount} (hidden unless the user asks about them)` : ""}
- Monthly entries available: ${monthRange}

## Tool usage rules

- ALWAYS call a tool before quoting a number. Never guess.
- For a specific month's performance → \`get_monthly_metrics\`.
- For "right now" / "current" net worth → \`get_net_worth_summary\`.
- For comparing two months ("how did X change from A to B") → \`compare_months\` in a single call. Do NOT call \`get_monthly_metrics\` twice — \`compare_months\` is faster.
- For trend questions over time ("past year", "when did my net worth peak") → \`get_time_series\`.
- For one account's trajectory ("how has my ISA grown") → \`get_account_history\` (call \`list_accounts\` first to get the accountId).
- \`list_accounts\` when you need to map a name to an id / type / currency.
- You may still chain tool calls when the question genuinely needs several different views of the data.

## Money formatting

- Monetary fields in tool responses come back as \`{ value, formatted }\`.
- When quoting an amount in your answer, copy the \`formatted\` string verbatim — do not reformat it, do not guess a currency symbol, do not convert.
- Use \`value\` only when you need to reason about relationships between numbers (e.g. to compute a percentage change or a ratio).
- \`savingsRatePercent\` and other percentage fields are plain numbers — quote them with a "%" suffix.

## Output style

- Answer in 2–4 sentences unless the user explicitly asks for detail.
- Be specific. "Your March savings rate was 12% because income was £X and spending was £Y" beats "You saved less in March."
- If the user asks "why", always compare the month in question to at least one other month when the data exists.
- Never apologise for needing to call tools. Just call them.

Today's date: ${today}`;
}
