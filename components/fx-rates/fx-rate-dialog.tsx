"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  createExchangeRate,
  updateExchangeRate,
  type FxRateRow,
} from "@/app/actions/fx-rates";

interface FxRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog edits this row; otherwise it creates a new one. */
  rate: FxRateRow | null;
  /** Months that already have a rate — blocks duplicate creation. */
  existingMonths: string[];
  onSaved: () => void;
}

function currentMonth(): string {
  // Avoids Date.now-based helpers; derive YYYY-MM from an ISO string.
  return new Date().toISOString().slice(0, 7);
}

export function FxRateDialog({
  open,
  onOpenChange,
  rate,
  existingMonths,
  onSaved,
}: FxRateDialogProps) {
  const isEdit = rate !== null;

  const [month, setMonth] = useState("");
  const [eurRate, setEurRate] = useState("");
  const [usdRate, setUsdRate] = useState("");
  const [aedRate, setAedRate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset the form whenever the dialog opens or the target row changes.
  useEffect(() => {
    if (!open) return;
    if (rate) {
      setMonth(rate.month);
      setEurRate(String(rate.eurRate));
      setUsdRate(String(rate.usdRate));
      setAedRate(String(rate.aedRate));
    } else {
      setMonth(currentMonth());
      setEurRate("");
      setUsdRate("");
      setAedRate("");
    }
  }, [open, rate]);

  const parsed = {
    eur: Number(eurRate),
    usd: Number(usdRate),
    aed: Number(aedRate),
  };

  const ratesValid =
    [parsed.eur, parsed.usd, parsed.aed].every(
      (v) => Number.isFinite(v) && v > 0,
    ) &&
    eurRate.trim() !== "" &&
    usdRate.trim() !== "" &&
    aedRate.trim() !== "";

  const duplicateMonth =
    !isEdit && month !== "" && existingMonths.includes(month);

  const canSave = month !== "" && ratesValid && !duplicateMonth && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const result = isEdit
        ? await updateExchangeRate(rate.id, {
            eurRate: parsed.eur,
            usdRate: parsed.usd,
            aedRate: parsed.aed,
          })
        : await createExchangeRate({
            month,
            eurRate: parsed.eur,
            usdRate: parsed.usd,
            aedRate: parsed.aed,
          });

      if (result.success) {
        toast({
          title: isEdit ? "Rate updated" : "Rate added",
          description: `Exchange rates for ${formatMonthLabel(month)} saved.`,
        });
        onSaved();
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: result.error ?? "Could not save the rate.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit FX rate" : "Add FX rate"}</DialogTitle>
          <DialogDescription>
            Rates are stored relative to GBP (1 GBP = X). GBP is always 1.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="fx-month">Month</Label>
            <Input
              id="fx-month"
              type="month"
              value={month}
              disabled={isEdit}
              onChange={(e) => setMonth(e.target.value)}
            />
            {duplicateMonth && (
              <p className="text-xs text-destructive">
                A rate already exists for this month. Edit it instead.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <RateField
              id="fx-gbp"
              label="GBP (base)"
              value="1"
              disabled
              onChange={() => {}}
            />
            <RateField
              id="fx-eur"
              label="EUR"
              value={eurRate}
              onChange={setEurRate}
            />
            <RateField
              id="fx-usd"
              label="USD"
              value={usdRate}
              onChange={setUsdRate}
            />
            <RateField
              id="fx-aed"
              label="AED"
              value={aedRate}
              onChange={setAedRate}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RateField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.0001"
        min="0"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.0000"
      />
    </div>
  );
}

function formatMonthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
