import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export function getModel(): LanguageModel {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const anthropic = createAnthropic({ apiKey });
  return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5");
}
