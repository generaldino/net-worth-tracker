"use client";

import { Button } from "@/components/ui/button";
import { useMasking } from "@/contexts/masking-context";
import { Eye, EyeOff } from "lucide-react";

export function MaskToggleButton() {
  const { isMasked, toggleMasking } = useMasking();

  return (
    <Button
      onClick={toggleMasking}
      variant="outline"
      size="sm"
      className="gap-2"
      aria-label={isMasked ? "Show values" : "Hide values"}
    >
      {isMasked ? (
        <>
          <EyeOff className="size-4" />
          <span className="hidden sm:inline">Show Values</span>
        </>
      ) : (
        <>
          <Eye className="size-4" />
          <span className="hidden sm:inline">Hide Values</span>
        </>
      )}
    </Button>
  );
}

