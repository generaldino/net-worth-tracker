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
      className="p-2"
      aria-label={isMasked ? "Show values" : "Hide values"}
    >
      {isMasked ? (
        <EyeOff className="size-4" />
      ) : (
        <Eye className="size-4" />
      )}
    </Button>
  );
}

