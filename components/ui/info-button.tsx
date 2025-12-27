"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InfoButtonProps {
  title: string;
  description: string;
  className?: string;
  size?: "sm" | "default";
}

export function InfoButton({
  title,
  description,
  className,
  size = "sm",
}: InfoButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={cn(
            "h-4 w-4 p-0 hover:bg-muted",
            size === "sm" && "h-4 w-4",
            className
          )}
          aria-label={`Info about ${title}`}
        >
          <Info className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

