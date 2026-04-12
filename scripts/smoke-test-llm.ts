/**
 * Phase 1 smoke test for the AI Assistant provider.
 * Run with: npm run smoke:llm
 *
 * Expects ANTHROPIC_API_KEY in .env (or .env.local).
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { generateText } from "ai";
import { getModel } from "@/lib/llm/provider";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY is not set. Add it to .env and re-run.");
    process.exit(1);
  }

  console.log(`→ Using model: ${process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5"}`);
  console.log("→ Sending a trivial prompt...\n");

  const { text, usage } = await generateText({
    model: getModel(),
    prompt: "Reply with exactly the word: pong",
    maxOutputTokens: 20,
  });

  console.log("Response:", JSON.stringify(text));
  console.log("Usage:", usage);

  const ok = text.toLowerCase().includes("pong");
  if (ok) {
    console.log("\n✅ Smoke test passed — provider is wired up correctly.");
  } else {
    console.log("\n⚠️  Got a response but it didn't contain 'pong'. Provider works, model is just chatty.");
  }
}

main().catch((err) => {
  console.error("❌ Smoke test failed:", err);
  process.exit(1);
});
