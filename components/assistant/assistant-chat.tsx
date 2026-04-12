"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useMasking } from "@/contexts/masking-context";
import { maskAbsoluteAmounts } from "./mask-amounts";
import { Loader2, Send, Square } from "lucide-react";
import type { Currency } from "@/lib/fx-rates";

type ApiCurrency = Currency;

const QUICK_PROMPTS = [
  "How did I do last month?",
  "What's my savings rate this year?",
  "Which account grew the most in 2025?",
  "Why did I save what I did last month?",
];

function resolveCurrency(uiCurrency: string): ApiCurrency {
  // The display-currency context allows a "BASE" meta-value that means GBP.
  // The API only accepts real ISO currencies.
  if (uiCurrency === "BASE") return "GBP";
  return uiCurrency as ApiCurrency;
}

export function AssistantChat() {
  const { displayCurrency } = useDisplayCurrency();
  const { isMasked } = useMasking();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resolved currency for the server. Re-keying useChat by this value resets
  // the conversation when the effective currency changes, so previous
  // assistant messages (which contain formatted strings in the old currency)
  // can't confuse the model on the next turn. BASE→GBP is a no-op so no reset.
  const apiCurrency = resolveCurrency(displayCurrency);

  // Build the transport once per apiCurrency. `body` is a function so the
  // latest value is read on every send (belt and braces — the id key makes
  // this mostly redundant, but it's cheap insurance).
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant",
        body: () => ({ displayCurrency: apiCurrency }),
      }),
    [apiCurrency],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    id: `assistant-${apiCurrency}`,
    transport,
  });

  // Auto-scroll to bottom when new content streams in.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  const submit = () => {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    sendMessage({ text });
  };

  const renderText = (text: string) =>
    isMasked ? maskAbsoluteAmounts(text) : text;

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4"
      >
        <div className="space-y-4 py-4">
          {messages.length === 0 ? (
            <EmptyState onPick={(prompt) => sendMessage({ text: prompt })} />
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                parts={m.parts}
                renderText={renderText}
              />
            ))
          )}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error.message}
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask about your finances…"
            rows={1}
            className="max-h-32 min-h-[40px] resize-none"
            disabled={isBusy && status === "submitted"}
          />
          {isBusy ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => stop()}
              aria-label="Stop"
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              aria-label="Send"
            >
              <Send className="size-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="space-y-3 pt-4">
      <p className="text-sm text-muted-foreground">
        Ask anything about your net worth, income, or spending. Try one of
        these:
      </p>
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((p) => (
          <Button
            key={p}
            variant="outline"
            size="sm"
            className="h-auto whitespace-normal text-left text-xs"
            onClick={() => onPick(p)}
          >
            {p}
          </Button>
        ))}
      </div>
    </div>
  );
}

// A single message bubble. Renders every part in order.
function MessageBubble({
  role,
  parts,
  renderText,
}: {
  role: "system" | "user" | "assistant";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: any[];
  renderText: (text: string) => string;
}) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <span key={i} className="whitespace-pre-wrap">
                {renderText(part.text as string)}
              </span>
            );
          }

          // Tool-call parts in v6 are emitted as `tool-<toolName>` with a
          // `state` field that walks "input-streaming" → "input-available"
          // → "output-available". Render a subtle "Fetching…" chip until
          // output arrives, then fade it out.
          if (
            typeof part.type === "string" &&
            part.type.startsWith("tool-")
          ) {
            const toolName = part.type.replace(/^tool-/, "");
            const done = part.state === "output-available";
            if (done) return null;
            return (
              <div
                key={i}
                className="my-1 flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Loader2 className="size-3 animate-spin" />
                <span>
                  Looking up <code className="font-mono">{toolName}</code>…
                </span>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
