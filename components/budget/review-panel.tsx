"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import { bulkSetCategory, type ExpenseRow } from "@/app/actions/expenses";
import { createCategoryRule } from "@/app/actions/expense-import";
import type { CategoryRow } from "@/app/actions/expense-categories";

interface ReviewPanelProps {
  expenses: ExpenseRow[];
  categories: CategoryRow[];
}

interface MerchantGroup {
  key: string;
  label: string;
  ids: string[];
  total: number;
  currency: ExpenseRow["currency"];
  sample: string;
}

/**
 * Categorising 300 statement rows one at a time is a non-starter — but those
 * rows are usually only ~40 merchants. This groups the uncategorised expenses
 * by merchant so a whole group is filed in one click, and offers to remember
 * the choice as a rule so the next import is already categorised.
 */
export function ReviewPanel({ expenses, categories }: ReviewPanelProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [learnRules, setLearnRules] = useState(true);

  const groups = useMemo<MerchantGroup[]>(() => {
    const map = new Map<string, MerchantGroup>();
    for (const e of expenses) {
      if (e.categoryId !== null) continue;
      const key = (e.merchant || e.description || "unknown").toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.ids.push(e.id);
        existing.total += e.amount;
      } else {
        map.set(key, {
          key,
          label: e.merchant || e.description || "Unknown",
          ids: [e.id],
          total: e.amount,
          currency: e.currency,
          sample: e.description,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => Math.abs(b.total) - Math.abs(a.total),
    );
  }, [expenses]);

  if (groups.length === 0) return null;

  const assign = async (group: MerchantGroup, categoryId: string) => {
    setPendingKey(group.key);

    const result = await bulkSetCategory(group.ids, categoryId);
    if (!result.success) {
      setPendingKey(null);
      toast({
        variant: "destructive",
        title: "Could not categorise",
        description: result.error,
      });
      return;
    }

    // Remember the choice so future imports of this merchant are automatic.
    if (learnRules) {
      const ruleResult = await createCategoryRule(group.label, categoryId);
      if (!ruleResult.success) {
        console.error("Failed to save rule:", ruleResult.error);
      }
    }

    setPendingKey(null);
    const categoryName =
      categories.find((c) => c.id === categoryId)?.name ?? "category";
    toast({
      title: `${group.ids.length} expense${group.ids.length === 1 ? "" : "s"} categorised`,
      description: learnRules
        ? `${group.label} → ${categoryName}. Future imports will match automatically.`
        : `${group.label} → ${categoryName}.`,
    });
    router.refresh();
  };

  return (
    <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Needs categorising</h2>
          <Badge variant="secondary">{groups.length} merchants</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="learn-rules"
            checked={learnRules}
            onCheckedChange={(v) => setLearnRules(v === true)}
          />
          <Label htmlFor="learn-rules" className="text-xs font-normal">
            Remember these choices for future imports
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        {groups.map((group) => {
          const busy = pendingKey === group.key;
          return (
            <div
              key={group.key}
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium capitalize">
                  {group.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {group.ids.length} transaction
                  {group.ids.length === 1 ? "" : "s"} · {group.sample}
                </p>
              </div>

              <span className="tabular-nums text-sm font-medium">
                {formatCurrencyAmount(group.total, group.currency)}
              </span>

              <div className="w-[180px]">
                {busy ? (
                  <div className="flex h-9 items-center justify-center">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                ) : (
                  <Select onValueChange={(v) => assign(group, v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Categorise…" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="size-3" />
        Categorising a merchant files every transaction from it at once.
      </p>
    </section>
  );
}
