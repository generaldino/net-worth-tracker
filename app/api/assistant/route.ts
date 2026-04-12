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
  const modelMessages: ModelMessage[] = [
    {
      role: "system",
      content: systemPrompt,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
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
