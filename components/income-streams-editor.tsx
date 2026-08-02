"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportedCurrencies } from "@/lib/types";
import { getCurrencySymbol, formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import type { IncomeStreamDraft } from "@/app/actions/income";
import { Plus, Trash2 } from "lucide-react";

interface IncomeStreamsEditorProps {
  streams: IncomeStreamDraft[];
  onChange: (streams: IncomeStreamDraft[]) => void;
}

/**
 * Editable list of income streams for a month (name + amount + currency).
 * Shared by the monthly update dialog and the standalone income dialog so both
 * stay consistent.
 */
export function IncomeStreamsEditor({
  streams,
  onChange,
}: IncomeStreamsEditorProps) {
  const total = useMemo(
    () => streams.reduce((sum, d) => sum + (d.amount || 0), 0),
    [streams],
  );

  const update = (index: number, patch: Partial<IncomeStreamDraft>) => {
    onChange(streams.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addLine = () => {
    onChange([...streams, { name: "", amount: 0, currency: "GBP" }]);
  };

  const removeLine = (index: number) => {
    onChange(streams.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {streams.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder="Source (e.g. Salary)"
              value={d.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <Input
              className="w-28"
              type="number"
              placeholder="0"
              value={d.amount || ""}
              onChange={(e) =>
                update(i, {
                  amount: Number.isFinite(Number.parseFloat(e.target.value))
                    ? Number.parseFloat(e.target.value)
                    : 0,
                })
              }
              onFocus={(e) => e.currentTarget.select()}
            />
            <Select
              value={d.currency}
              onValueChange={(v) => update(i, { currency: v as Currency })}
            >
              <SelectTrigger className="w-[72px]">
                <SelectValue>{getCurrencySymbol(d.currency)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {supportedCurrencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {getCurrencySymbol(c)} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLine(i)}
              aria-label="Remove income stream"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          <Plus className="h-4 w-4 mr-1" /> Add income
        </Button>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            Total{" "}
            {formatCurrencyAmount(total, streams[0]?.currency ?? "GBP")}
          </span>
        )}
      </div>
    </div>
  );
}
