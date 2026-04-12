"use client";

import { useEffect } from "react";
import { X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AssistantChat } from "./assistant-chat";
import { useAssistant } from "./assistant-provider";
import { cn } from "@/lib/utils";

/**
 * A right-rail drawer that slides in from the right on desktop (400px wide)
 * and takes the full width on mobile. Deliberately has NO backdrop — the
 * dashboard must remain visible and interactive while the drawer is open
 * (Option A: look at chart → ask question → read answer without losing sight
 * of the chart).
 *
 * The container is always mounted so `useChat` state inside AssistantChat
 * persists across open/close toggles. Visibility is controlled via CSS
 * transforms, not conditional rendering.
 */
export function AssistantDrawer() {
  const { isOpen, close, canUseAssistant } = useAssistant();

  // Esc closes the drawer.
  useEffect(() => {
    if (!canUseAssistant) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close, canUseAssistant]);

  if (!canUseAssistant) return null;

  return (
    <aside
      aria-label="AI assistant"
      aria-hidden={!isOpen}
      className={cn(
        "fixed top-0 right-0 z-40 flex h-[100dvh] flex-col bg-background shadow-2xl border-l transition-transform duration-300 ease-out",
        "w-full sm:w-[400px]",
        isOpen ? "translate-x-0" : "translate-x-full pointer-events-none",
      )}
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold">AI Assistant</h2>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="How this works"
                  >
                    <Info className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  Your questions and the relevant data from your accounts are
                  sent to Anthropic (Claude) to generate answers. Anthropic
                  does not train on this data.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground">
            Ask about your finances
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label="Close assistant"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-hidden">
        <AssistantChat />
      </div>
    </aside>
  );
}
