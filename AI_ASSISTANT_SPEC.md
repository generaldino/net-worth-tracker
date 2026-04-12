# AI Financial Assistant — Feature Spec

A natural-language Q&A assistant layered on top of the existing net-worth app. Users can ask questions like *"why did I only save 5% in March?"* and get grounded answers computed from their own data.

Runs on **Anthropic Claude Haiku 4.5** by default — the best cost/quality sweet spot for personal use at roughly $1–3/month with prompt caching. A swappable provider adapter keeps the door open to self-hosted Ollama or other APIs (OpenAI, Groq, Gemini) with a one-line change.

---

## 1. Goals & non-goals

**Goals**
- Ask free-text questions about personal financial data and get grounded, numeric answers.
- Reuse the existing Drizzle query layer — no new database, no data duplication.
- LLM provider is a swappable adapter. Default = Anthropic Claude Haiku 4.5. Optional self-hosted path via Ollama for a privacy-first mode.
- Strict per-user data isolation (same auth scoping as the rest of the app).

**Non-goals (v1)**
- No write operations (the assistant reads only, never mutates accounts or entries).
- No long-term memory across conversations — each chat is stateless apart from the current thread.
- No RAG over external documents — all context comes from the user's own DB.

---

## 2. Architecture at a glance

```
┌──────────────────┐        ┌──────────────────────┐        ┌────────────────────┐
│  /app/assistant  │──POST──▶  /app/api/assistant  │──tool──▶  lib/actions.ts    │
│  (chat UI)       │        │  (server route)      │  calls │  (existing queries)│
└──────────────────┘        └──────────┬───────────┘        └────────────────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │  lib/llm/provider.ts │──▶ Anthropic (default) | Ollama | OpenAI | ...
                            │  (provider adapter)  │    (picked via env var)
                            └──────────────────────┘
```

Key idea: **tool-calling, not text-to-SQL**. The LLM never sees raw SQL or writes queries. It sees a menu of typed "tools" (server-side TypeScript functions) that it can call. Each tool is already user-scoped via `getAccessibleUserIds()`, so prompt injection cannot leak other users' data.

---

## 3. Stack choice — Haiku-first, pluggable

### 3.1 The LLM layer — Vercel AI SDK

Use the [`ai`](https://sdk.vercel.ai) package. It is the most flexible option for this project because:

- It has first-class providers for **Anthropic, Ollama, OpenAI, Groq, Google, Mistral, OpenRouter** — switch with one import.
- It has a stable `generateText` / `streamText` + `tools` API that works identically across providers, so the app code does not change when you swap models.
- It already plays nicely with Next.js 15 App Router (server actions + `Response` streaming).
- MIT licensed, zero runtime cost.

Install:

```bash
npm install ai @ai-sdk/anthropic zod
```

(Add `ollama-ai-provider` only if/when you decide to run the optional local path.)

### 3.2 Default model — Claude Haiku 4.5 (recommended)

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5
```

**Why Haiku is the right default for this use case:**

- **Tool calling is the whole feature.** Haiku is near-Sonnet-level at structured tool use; small open models mis-route queries and invent arguments on complex questions.
- **Numerical fidelity.** "Why did I save 5% in March?" requires pulling two months, diffing them, and explaining the delta without fabricating numbers. Haiku is reliable here.
- **Cost at personal scale.** With prompt caching on (system prompt + tool defs + schema cheat sheet are identical across turns), expect **~$1–3/month** for ~10 questions/day and **~$5–8/month** for ~50 questions/day. Turn caching on from day one — see §7.
- **Latency.** Fast enough that streaming feels snappy in the UI.
- **Upgrade path.** If you ever hit a question Haiku fumbles, flip `ANTHROPIC_MODEL=claude-sonnet-4-5` — same env var, no code change.

### 3.3 Optional: self-hosted Ollama (privacy-first mode)

Kept as a documented alternative, not the default. Pick this only if you explicitly do not want financial data leaving your machine — the accuracy gap vs Haiku is real and not worth the ~$2/month savings for most users.

```bash
brew install ollama
ollama pull qwen2.5:7b-instruct     # best small open model for tool calls, ~5GB
# or: ollama pull llama3.1:8b-instruct
```

```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/api
OLLAMA_MODEL=qwen2.5:7b-instruct
```

**Caveat for Vercel deployments:** `localhost` Ollama will not work from a production Vercel function. If you want the self-hosted path in production, point `OLLAMA_BASE_URL` at a hosted inference box (small RunPod / Fly.io machine running Ollama behind auth).

### 3.4 Other providers the adapter supports day-one

Each is a single `case` in `lib/llm/provider.ts`:

- **Google Gemini 2.5 Flash** — even cheaper than Haiku and has a generous free tier. Slightly weaker tool calling. Good "cost experiment" candidate once the feature is stable. `@ai-sdk/google`.
- **OpenAI GPT-4o mini** — cheap, fine at tool calls, weaker at "explain the why" reasoning than Haiku. `@ai-sdk/openai`.
- **Groq (Llama 3.3 70B)** — free tier, extremely fast inference, but Llama's tool calling is the weakest of the bunch and free-tier rate limits bite. `@ai-sdk/groq`.
- **OpenRouter** — one key, many models, pay-per-token. Useful for A/B experiments. `@ai-sdk/openai` with a custom baseURL.

---

## 4. The provider adapter (`lib/llm/provider.ts`)

Single file, one export. Everything downstream imports from here so swapping providers never touches application code.

**Phase 1 version** — Anthropic only. Everything the app needs to ship v1.

```ts
// lib/llm/provider.ts
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export function getModel(): LanguageModel {
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5");
}
```

That's it. No `LLM_PROVIDER` env var, no switch statement, no unused imports. You only need that layer the day you actually want a second provider — and when that day comes, expanding this file is a 5-minute change:

```ts
// Later, when adding a second provider:
type ProviderName = "anthropic" | "ollama" | "openai" | "groq" | "google";

export function getModel(): LanguageModel {
  const provider = (process.env.LLM_PROVIDER ?? "anthropic") as ProviderName;
  switch (provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5");
    }
    case "ollama": {
      // npm install ollama-ai-provider
      const { createOllama } = await import("ollama-ai-provider");
      const ollama = createOllama({ baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/api" });
      return ollama(process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct");
    }
    // openai / groq / google: one case each, same shape
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
  }
}
```

The chat route imports `getModel()` either way and is unaffected by the expansion.

That is the *entire* swap surface. The chat route imports `getModel()` and never knows or cares which provider is behind it.

---

## 5. Tool definitions — the assistant's hands

Tools are thin wrappers around existing functions in `lib/actions.ts`. Each tool:
1. Declares a zod input schema (the AI SDK uses it to constrain LLM output).
2. Calls `getAccessibleUserIds()` internally — *never* accepts a userId from the LLM.
3. Returns a compact JSON object the model can reason about.

Suggested v1 toolset (all map to functions that already exist):

| Tool name | Wraps | What the model uses it for |
|---|---|---|
| `get_net_worth_summary` | `calculateNetWorth`, `getNetWorthBreakdown` | "What am I worth right now?" |
| `get_monthly_metrics` | `getFinancialMetrics` + month filter | "What was my savings rate in March?" |
| `get_monthly_entries` | `getMonthlyData` | Drill-down per account per month |
| `get_account_history` | `getAccountHistory` | "Show the trend of my ISA" |
| `list_accounts` | `getAccounts` | Name/type/currency lookup |
| `get_time_series` | `getChartData` | Net worth over any period |
| `compare_months` | composed helper | Diff two months' income / spend / savings |

**Request context.** The API route passes a `ctx` object into a tool factory, not globals, so each tool knows the user's *display currency*. FX is handled server-side so the LLM never has to convert. Masking is **not** part of this context — it's a pure render-time concern on the client (see §8).

```ts
// lib/llm/tools.ts
import { tool } from "ai";
import { z } from "zod";
import { getFinancialMetrics } from "@/lib/actions";
import { convertToCurrency } from "@/lib/fx-rates-server";
import type { Currency } from "@/lib/types";

export interface AssistantContext {
  displayCurrency: Currency;     // picked in the chat UI, read from display-currency-context
}

// Shape every monetary field in every tool response uses.
// The model copies `formatted` verbatim — it never picks a currency symbol itself.
interface Money {
  value: number;     // numeric, for the model to reason with ("15% higher than…")
  formatted: string; // pre-rendered with Intl.NumberFormat, e.g. "€4,200.00"
}

function money(valueInGBP: number, currency: Currency): Money {
  const converted = convertToCurrency(valueInGBP, currency); // server-side FX
  return {
    value: converted,
    formatted: new Intl.NumberFormat(undefined, { style: "currency", currency }).format(converted),
  };
}

export function buildTools(ctx: AssistantContext) {
  return {
    get_monthly_metrics: tool({
      description:
        "Returns income, expenditure, savings, and savings rate for a given month. " +
        "Monetary fields come back as { value, formatted } — quote the `formatted` string in your answer. " +
        "Use for questions about a specific month's performance.",
      inputSchema: z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/).describe("YYYY-MM"),
      }),
      execute: async ({ month }) => {
        const raw = await getFinancialMetrics({ month }); // user-scoped internally, returns GBP
        return {
          month,
          income: money(raw.income, ctx.displayCurrency),
          expenditure: money(raw.expenditure, ctx.displayCurrency),
          savings: money(raw.savings, ctx.displayCurrency),
          savingsRate: raw.savingsRate, // plain number — percentages aren't currency-denominated
        };
      },
    }),
    // ...one entry per tool above, each following the same { value, formatted } pattern for money
  };
}
```

And the route builds tools per-request:

```ts
const tools = buildTools({ displayCurrency });
await streamText({ model: getModel(), system, tools, messages, maxSteps: 6 });
```

**Rules of thumb for tool design:**
- **Narrow inputs.** A `month: YYYY-MM` string is easier to generate correctly than a free-form date.
- **Small outputs.** Return only the columns the model needs. Large dumps burn tokens and dilute reasoning.
- **Descriptive `description`.** This is the model's documentation — it picks tools based on it.
- **No userId parameter ever.** Always resolve from the session.
- **Never ask the LLM to do FX math or currency formatting.** Both are done in the tool via `lib/fx-rates-server.ts` + `Intl.NumberFormat`, and surfaced as a `{ value, formatted }` pair. The model copies `formatted` verbatim and uses `value` only when it needs to reason ("about 15% more than…").

---

## 6. The API route (`app/api/assistant/route.ts`)

A standard Next.js route that streams an AI SDK response.

```ts
// app/api/assistant/route.ts
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { ModelMessage, UIMessage } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/llm/provider";
import { buildTools } from "@/lib/llm/tools";
import { buildSystemPrompt } from "@/lib/llm/system-prompt";
import { canUseAssistant } from "@/lib/llm/access";

export const runtime = "nodejs"; // tools import server-only code

const RequestSchema = z.object({
  messages: z.array(z.any()),
  displayCurrency: z.enum(["GBP", "EUR", "USD", "AED"]).default("GBP"),
});

export async function POST(req: Request) {
  if (!(await canUseAssistant())) {
    return new Response("Not found", { status: 404 });
  }

  const { messages: uiMessages, displayCurrency } = RequestSchema.parse(
    await req.json(),
  );

  const systemPrompt = await buildSystemPrompt(); // currency-agnostic
  const tools = buildTools({ displayCurrency });
  const converted = await convertToModelMessages(uiMessages as UIMessage[]);

  // System message sits at the top of messages[] with cache control attached
  // via providerOptions. One cache entry covers every currency because the
  // prompt is currency-agnostic (see §7).
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
    stopWhen: stepCountIs(6), // allow up to 6 tool-call steps per turn
  });

  return result.toUIMessageStreamResponse();
}
```

The `stopWhen: stepCountIs(6)` matters: it lets the model call several tools in a row ("first fetch March, then compare to February, then answer"). The AI SDK default is `stepCountIs(1)` — without raising it, the model can only call one tool before being forced to respond. Streaming is the default (`streamText` + `toUIMessageStreamResponse`) — tool calls and tokens arrive incrementally so the UI can show "Fetching March metrics…" as it happens.

> **v5→v6 API note.** The AI SDK v5 renamed several things the older spec drafts used: `maxSteps` → `stopWhen: stepCountIs(n)`, `convertToCoreMessages` → `convertToModelMessages` (now async), `toDataStreamResponse` → `toUIMessageStreamResponse`, `tool({ parameters })` → `tool({ inputSchema })`. The `system` string field still exists on `streamText` but does NOT support prompt caching — to cache the system prompt you must pass it as the first entry in `messages[]` with `providerOptions.anthropic.cacheControl`, as shown above.

---

## 7. The system prompt (`lib/llm/system-prompt.ts`)

The system prompt is the single most important thing for answer quality. It should contain:

1. **Role + goal.** *"You are a personal finance assistant for a single user. Answer questions about their net worth, income, and spending using the tools provided. Do not make up numbers."*
2. **Schema cheat sheet.** A compact description of what accounts and month range the user has. Generate this dynamically at request time by calling `getAccounts()` + a lightweight "earliest/latest month" query — the model reasons much better when it knows *which* months and *which* accounts exist.
3. **Tool usage rules.** *"Always call a tool before quoting a number. Prefer `get_monthly_metrics` over `get_monthly_entries` when a single month is involved."*
4. **Money formatting.** *"Monetary fields in tool responses come back as `{ value, formatted }`. When you quote an amount in your answer, copy the `formatted` string verbatim — do not reformat it, do not guess a currency symbol, do not convert. Use `value` only if you need to reason about relationships between numbers (e.g. to compute a percentage change)."*
5. **Output style.** *"Answer in 2–4 sentences unless the user asks for detail."*
6. **Today's date.** Inject `new Date()` so "last month" is resolvable.

**The prompt is currency-agnostic.** It never mentions GBP/EUR/USD/AED. Conversion and formatting happen entirely server-side in the tools (§5), so the model never has to decide on a symbol — it just copies the `formatted` string the tool handed it. Switching the UI currency changes what the tools return, not what the prompt says.

**The prompt is also masking-agnostic.** Haiku always emits real absolute numbers. Masking is applied client-side at render time (§8) so the user can toggle the existing mask/unmask button to reveal or hide amounts in-place — just like every other number on the dashboard.

**Anthropic prompt caching.** The system prompt + tool defs + schema cheat sheet will be ~1.5–3k tokens and identical across every turn, currency, and masking state. Because nothing in the prompt varies by UI mode, **one cache entry covers every request** — the cleanest possible setup. Mark the system message with `providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } }` and you'll hit the cache on every turn after the first, cutting input cost ~90%. This is the single biggest lever for keeping the monthly bill at $1–3 instead of $10+.

The only thing that changes turn-to-turn is the date injection. Put it last so it doesn't invalidate the rest of the cached prefix.

---

## 8. Frontend — `/app/assistant`

Minimal, built with components already in the repo. Reuses two existing contexts — `display-currency-context.tsx` and `masking-context.tsx` — so the assistant respects whatever mode the user has set elsewhere in the dashboard.

**Files to add:**
- `app/assistant/page.tsx` — server component, auth-gated via `canUseAssistant()`, renders `<AssistantChat />`.
- `components/assistant/assistant-chat.tsx` — client component, uses `useChat` from `ai/react`, reads both contexts.
- `components/assistant/mask-amounts.ts` — tiny helper that masks absolute currency amounts in a string.
- Link in `components/dashboard-shell.tsx`, hidden for non-allowlisted users.

**How masking works here (same model as the rest of the app).** The stored message content always contains real absolute numbers — exactly what Haiku returned. Whether they're *shown* masked or unmasked is decided at render time by reading `isMasked` from the existing `masking-context`. The existing unmask button in the app toolbar already flips `isMasked`, so it automatically reveals amounts in the chat too. No separate toggle to build.

**Wiring:**

```tsx
"use client";
import { useChat } from "ai/react";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useMasking } from "@/contexts/masking-context";
import { maskAbsoluteAmounts } from "./mask-amounts";

export function AssistantChat() {
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const { isMasked } = useMasking();

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/assistant",
    body: { displayCurrency },
    // Switching currency resets history — stale GBP numbers would confuse the model.
    // Masking does NOT reset history; it's a pure render transform.
    id: displayCurrency,
  });

  return (
    <Card>
      <MessageList
        messages={messages}
        // Apply masking at render time only. Toggling isMasked re-renders
        // the same stored message content with/without amounts scrubbed.
        render={(text) => (isMasked ? maskAbsoluteAmounts(text) : text)}
      />
      <form onSubmit={handleSubmit} className="flex gap-2">
        {/* Inline currency picker — switches the GLOBAL display currency */}
        <CurrencySelect value={displayCurrency} onChange={setDisplayCurrency} />
        <Input value={input} onChange={handleInputChange} placeholder="Ask about your finances…" />
        <Button type="submit" disabled={isLoading}>Ask</Button>
      </form>
    </Card>
  );
}
```

**Why `setDisplayCurrency` (not a local state):** the chat picker writes through to the existing global context, so switching currency in the chat *also* updates the main dashboard charts and numbers. One control, two effects — this is what you asked for.

**Why `id: displayCurrency`:** changes to the chat `id` tell `useChat` to start a fresh thread. Without this, switching currency mid-conversation would leave stale GBP numbers in the history and confuse the model on the next turn. Masking changes do not change the `id` — same messages, same stored content, just re-rendered through the mask function.

**`mask-amounts.ts`:**

```ts
// Regex that catches £1,234.56 / $1234 / €12.00 / 1 234,56 د.إ
const AMOUNT_RE = /[£$€]\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\s?د\.إ/g;

export function maskAbsoluteAmounts(text: string): string {
  return text.replace(AMOUNT_RE, "•••");
}
```

Percentages (`12%`), ratios, and counts pass through untouched — consistent with how masking works on the rest of the dashboard. If the existing mask UI uses a different glyph (e.g. `***`), mirror it here for consistency.

Use the shadcn components already installed (`Card`, `Input`, `Button`, `Select`, `ScrollArea`). Render assistant messages through `react-markdown` (already a dependency).

**Suggested quick-prompt chips** above the input:
- "How did I do last month?"
- "What's my savings rate trend this year?"
- "Which account grew the most in 2025?"
- "Why did I only save X% in <month>?"

---

## 9. Feature toggle — allowlist by user ID (with shared-dashboard propagation)

The assistant ships behind a hardcoded allowlist so only specific users see it. Crucially, the check *also* grants access to anyone who has a shared dashboard from an allowlisted user — because the tools read data via `getAccessibleUserIds()`, any shared-with user is already authorised to see that data everywhere else in the app.

**`lib/llm/access.ts`**

```ts
import { getAccessibleUserIds } from "@/lib/auth-helpers";

// Users allowed to use the AI assistant feature.
// Add UUIDs here to grant access. Anyone who has a shared dashboard
// from one of these users will automatically inherit access too.
const ASSISTANT_ALLOWLIST: ReadonlySet<string> = new Set([
  "0e6dbbc5-c905-401a-b974-3d5b35cbf329",
]);

/**
 * Returns true if the current session user is allowed to use the assistant,
 * either because they are on the allowlist OR because they have a shared
 * dashboard from someone who is.
 */
export async function canUseAssistant(): Promise<boolean> {
  try {
    const accessible = await getAccessibleUserIds(); // returns [] if unauthenticated
    return accessible.some((id) => ASSISTANT_ALLOWLIST.has(id));
  } catch {
    return false;
  }
}
```

**Why this shape:** `getAccessibleUserIds()` already returns `[currentUserId, ...sharedDashboardOwnerIds]`. If any of those IDs is on the allowlist, the user can see allowlisted data — so they should also be able to ask the assistant about it. A non-allowlisted user with no share will get back `[theirOwnId]` which never intersects the allowlist, so they're blocked.

**Enforce in three places** (defence in depth — the API route is the real gate, the others just avoid showing a broken UI):

1. **API route** — the only one that actually matters for security:
   ```ts
   // app/api/assistant/route.ts
   import { canUseAssistant } from "@/lib/llm/access";

   export async function POST(req: Request) {
     if (!(await canUseAssistant())) {
       return new Response("Not found", { status: 404 });
     }
     // ...rest of handler
   }
   ```
   Return `404` rather than `403` so non-allowlisted users cannot tell the feature exists.

2. **Page** — so a direct visit to `/assistant` 404s cleanly instead of rendering a chat that then errors:
   ```ts
   // app/assistant/page.tsx
   import { notFound } from "next/navigation";
   import { canUseAssistant } from "@/lib/llm/access";

   export default async function AssistantPage() {
     if (!(await canUseAssistant())) notFound();
     return <AssistantChat />;
   }
   ```

3. **Sidebar** — hide the nav link for non-allowlisted users so they never see it. In `components/dashboard-shell.tsx`, call `await canUseAssistant()` (the shell is already a server component) before rendering the link.

**Naturally handles shared dashboards:** user A (allowlisted) shares their dashboard with user B. User B signs in, `getAccessibleUserIds()` returns `[B, A]`, `A` is on the allowlist → B gets the assistant, and the tools automatically surface A's data because they also go through `getAccessibleUserIds()`. No extra config.

**To add more users later:** append their UUID to `ASSISTANT_ALLOWLIST` and redeploy. If the list grows past a handful, move it to env (`ASSISTANT_ALLOWED_USER_IDS=uuid1,uuid2,...`) and parse at module load — still no DB involved.

---

## 10. Security & privacy

- **Auth on every request.** The API route calls `getUserId()` first; unauthenticated = 401.
- **User scoping inside every tool**, not in the prompt. The LLM has no ability to request data for another user because no tool accepts a userId argument.
- **No raw SQL.** The LLM cannot run arbitrary queries — only the finite set of tools in `lib/llm/tools.ts`.
- **Third-party data exposure.** On the default Anthropic path, the user's account names and numbers *will* be sent to Anthropic's API. Anthropic does not train on API traffic by default, but you should still surface a one-line notice on the `/assistant` page so the user knows. If you need data to never leave the machine, switch `LLM_PROVIDER=ollama` (§3.3) — same code, local inference.
- **Rate limit the route** (simple in-memory counter keyed on userId is fine for personal use; Upstash free tier if you ever go multi-user).

---

## 11. Env vars to add

```bash
# choose one: anthropic | ollama | openai | groq | google
# defaults to "anthropic" if unset
LLM_PROVIDER=anthropic

# Anthropic (default)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5

# Ollama (optional — privacy-first self-hosted path)
OLLAMA_BASE_URL=http://localhost:11434/api
OLLAMA_MODEL=qwen2.5:7b-instruct
```

Add these to `.env.example` with empty values so future-you remembers they exist.

---

## 12. Build plan — phased

**Phase 1 — plumbing (half a day)**
1. `npm install ai @ai-sdk/anthropic zod`
2. Create `lib/llm/provider.ts` with the Anthropic case (add Ollama later only if needed).
3. Create `lib/llm/access.ts` with the allowlist (§9).
4. Add `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL=claude-haiku-4-5` to `.env.local` and `.env.example`.
5. Smoke-test: call `generateText({ model: getModel(), prompt: "hello" })` from a scratch script.

**Phase 2 — tools (half a day)**
1. Create `lib/llm/tools.ts` exporting `buildTools(ctx)` with `get_monthly_metrics`, `list_accounts`, `get_net_worth_summary`.
2. Each tool pre-converts amounts to `ctx.displayCurrency` via `lib/fx-rates-server.ts`.
3. Unit-test each tool by calling it directly with a fixed userId + a fixed currency — make sure outputs are small, clean, and correctly converted.

**Phase 3 — API route (half a day)**
1. Create `app/api/assistant/route.ts` with `streamText` + `maxSteps: 6`.
2. Build `lib/llm/system-prompt.ts` that inlines accounts + available month range.
3. Turn on Anthropic prompt caching on the system message (see §7) — biggest cost lever, do it now not later.
4. Hit it with `curl` and sanity-check a tool-calling loop end-to-end.

**Phase 4 — UI (half a day)**
1. `app/assistant/page.tsx` (server component, allowlist-gated) + `components/assistant/assistant-chat.tsx` using `useChat`.
2. Wire `displayCurrency` and `privacyMode` from the existing contexts into the `useChat` `body` option (§8).
3. Add the inline `<CurrencySelect>` picker in the input row — writes through to the global display-currency context.
4. Add `components/assistant/mask-response.tsx` with the `maskAbsoluteAmounts` regex helper.
5. Add sidebar link in `components/dashboard-shell.tsx`, hidden for non-allowlisted users via `await canUseAssistant()`.
6. Add 4–6 quick-prompt chips.

**Phase 5 — polish**
- Add the remaining tools (`compare_months`, `get_account_history`, `get_time_series`).
- Add a "thinking..." state that shows which tool is currently running.
- Markdown rendering for the assistant's response.
- Add a small "AI — sends data to Anthropic" notice on the `/assistant` page.

**Phase 6 — eval (optional but worth it)**
Create `scripts/eval-assistant.ts` with ~20 seeded questions and expected numeric answers computed directly from the DB. Run it against Haiku first to set a baseline, then optionally against Sonnet (upgrade path), Gemini Flash (cheaper experiment), and qwen2.5 (self-hosted experiment). This is how you know when it's worth switching providers.

---

## 13. Decisions (locked in)

1. **Deployment target: cloud-ready.** The default stack (Vercel AI SDK + Anthropic Haiku) works identically on localhost and on Vercel production — no extra infra. Ollama stays documented as an optional privacy-first path but is not part of v1.
2. **Streaming responses.** The API route uses `streamText` + `toDataStreamResponse`, the client uses `useChat`. Tool calls and tokens arrive incrementally, so the UI can show "Fetching March metrics…" as it happens. Block mode is only used in the eval script (Phase 6).
3. **Currency: inline picker wired to the global context, conversion + formatting fully server-side.** A small `<CurrencySelect>` sits in the chat input row and writes through to `display-currency-context.tsx`. Changing it also updates the rest of the dashboard. The selected currency is sent to the API route on every request and passed into the tools. Each monetary field in a tool response is returned as a `{ value, formatted }` pair, where `formatted` is pre-rendered via `Intl.NumberFormat` server-side. The model copies `formatted` verbatim in its answer — it never sees "the current currency" and never picks a symbol. The system prompt is therefore currency-invariant (one Anthropic cache entry total). Switching currency mid-conversation still resets chat history via `useChat` `id` because prior assistant messages contain the old formatted strings.
4. **Masking: pure render-time transform, identical to the rest of the app.** Haiku always emits real absolute numbers; the system prompt is agnostic to masking. The chat reads `isMasked` from the existing `masking-context` and runs message content through a regex that scrubs absolute currency amounts only when the mask is on. The existing unmask button in the app toolbar already flips `isMasked`, so it reveals chat amounts in-place without any chat-specific control. Percentages pass through untouched. Toggling the mask does not reset chat history.
5. **Shared dashboards inherit access.** `canUseAssistant()` checks `getAccessibleUserIds()` against the allowlist rather than just the current user ID, so anyone who has a dashboard shared from an allowlisted user automatically gets the assistant on that data. See §9.

---

## TL;DR

Build it with the **Vercel AI SDK + tool calling**, not text-to-SQL. Default to **Anthropic Claude Haiku 4.5** with **prompt caching on from day one** — it has the right tool-calling quality and numerical reliability for this use case, and at personal volume (~10 questions/day) it costs **~$1–3/month**. Keep a self-hosted Ollama path documented as an optional privacy-first mode, but don't make it the default. Wrap existing `lib/actions.ts` functions as tools so user scoping is enforced server-side and the LLM can never see another user's data. Gate the whole thing behind a hardcoded allowlist so only your user ID sees it. Total build cost: ~2 days for a working v1.
