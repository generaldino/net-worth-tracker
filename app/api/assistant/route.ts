import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { ModelMessage, UIMessage } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/llm/provider";
import { buildTools } from "@/lib/llm/tools";
import { buildSystemPrompt } from "@/lib/llm/system-prompt";
import { canUseAssistant } from "@/lib/llm/access";

export const runtime = "nodejs";

const RequestSchema = z.object({
  messages: z.array(z.any()),
  displayCurrency: z.enum(["GBP", "EUR", "USD", "AED"]).default("GBP"),
});

export async function POST(req: Request) {
  if (!(await canUseAssistant())) {
    return new Response("Not found", { status: 404 });
  }

  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const { messages: uiMessages, displayCurrency } = parsed;

  const systemPrompt = await buildSystemPrompt();
  const tools = buildTools({ displayCurrency });

  // System message sits at the top of the messages array with cache control
  // attached via providerOptions. This lets Anthropic cache the stable prefix
  // (schema, rules, tool descriptions) across turns — ~90% input-token savings
  // on repeat requests. One cache entry covers every currency because the
  // prompt is currency-agnostic (see spec §7).
  const converted = await convertToModelMessages(uiMessages as UIMessage[]);

  // Two system messages by design:
  // (1) Stable, cached prefix — never contains anything that varies turn-to-turn.
  // (2) Uncached "context" message carrying today's date and the active display
  //     currency. These change daily / per-session and would otherwise silently
  //     bust the cache on message (1). Keeping them in a separate, uncached
  //     block lets Anthropic reuse the cached prefix forever while still giving
  //     the model the context it needs.
  const today = new Date().toISOString().slice(0, 10);
  const modelMessages: ModelMessage[] = [
    {
      role: "system",
      content: systemPrompt,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
    {
      role: "system",
      content: `Context: today is ${today}. Session display currency is ${displayCurrency}.`,
    },
    ...converted,
  ];

  const result = streamText({
    model: getModel(),
    messages: modelMessages,
    tools,
    // Allow the model to chain up to 6 steps before being forced to respond.
    // Enough for "fetch March → fetch February → explain" without runaway cost.
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse();
}
