"use client";

import { AlertTriangle, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  DataHealthWarning,
  WarningCode,
  WarningSeverity,
} from "@/lib/data-health";

const CODE_ICONS: Record<WarningCode, typeof AlertTriangle> = {
  INCOME_GT_CASHIN: AlertTriangle,
  GROWTH_ON_CURRENT: AlertTriangle,
  POSSIBLE_TRANSFER: ArrowLeftRight,
};

const SEVERITY_CLASSES: Record<
  WarningSeverity,
  { container: string; icon: string; badge: "destructive" | "secondary" }
> = {
  warning: {
    container:
      "border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-400",
    badge: "destructive",
  },
  info: {
    container: "border-sky-500/40 bg-sky-500/5 text-sky-900 dark:text-sky-100",
    icon: "text-sky-600 dark:text-sky-400",
    badge: "secondary",
  },
};

interface WarningListProps {
  warnings: DataHealthWarning[];
  showAccount?: boolean;
  showMonth?: boolean;
  emptyMessage?: string;
  className?: string;
  onWarningClick?: (warning: DataHealthWarning) => void;
}

export function WarningList({
  warnings,
  showAccount = true,
  showMonth = true,
  emptyMessage,
  className,
  onWarningClick,
}: WarningListProps) {
  if (warnings.length === 0) {
    if (!emptyMessage) return null;
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {warnings.map((w, i) => {
        const Icon = CODE_ICONS[w.code];
        const tone = SEVERITY_CLASSES[w.severity];
        const clickable = Boolean(onWarningClick);
        const content = (
          <div className="flex items-start gap-2">
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone.icon)} />
            <div className="min-w-0 flex-1 space-y-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{w.title}</span>
                {showAccount && (
                  <span className="text-xs text-muted-foreground truncate">
                    {w.accountName}
                    {w.accountOwner ? ` · ${w.accountOwner}` : ""}
                    {w.counterparty && (
                      <>
                        {" ↔ "}
                        {w.counterparty.accountName}
                        {w.counterparty.accountOwner
                          ? ` · ${w.counterparty.accountOwner}`
                          : ""}
                      </>
                    )}
                  </span>
                )}
                {showMonth && (
                  <Badge variant="outline" className="text-[10px]">
                    {formatMonth(w.month)}
                  </Badge>
                )}
              </div>
              <p className="text-xs leading-snug opacity-90">{w.detail}</p>
              {clickable && (
                <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                  Click to review entries
                </p>
              )}
            </div>
          </div>
        );
        return (
          <li
            key={`${w.code}-${w.accountId}-${w.month}-${i}`}
            className={cn(
              "rounded-md border text-xs sm:text-sm",
              tone.container,
              clickable
                ? "cursor-pointer transition hover:shadow-sm hover:brightness-105 focus-within:ring-2 focus-within:ring-ring/50"
                : "",
            )}
          >
            {clickable ? (
              <button
                type="button"
                onClick={() => onWarningClick?.(w)}
                className="w-full px-3 py-2"
              >
                {content}
              </button>
            ) : (
              <div className="px-3 py-2">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}
