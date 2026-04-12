"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistant } from "./assistant-provider";

export function AssistantTriggerButton() {
  const { toggle, canUseAssistant, isOpen } = useAssistant();

  if (!canUseAssistant) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      aria-pressed={isOpen}
      title="AI assistant (⌘J)"
    >
      <Sparkles className="size-4" />
    </Button>
  );
}
