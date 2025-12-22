"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supportedCurrencies, currencyLabels } from "@/lib/types";
import type { Currency } from "@/lib/fx-rates";

interface CurrencySelectorProps {
  value: Currency;
  onValueChange: (currency: Currency) => void;
  label?: string;
}

export function CurrencySelector({
  value,
  onValueChange,
  label = "Display Currency",
}: CurrencySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="currency-select" className="text-sm">
        {label}:
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="currency-select" className="w-[180px]">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {supportedCurrencies.map((currency) => (
            <SelectItem key={currency} value={currency}>
              {currencyLabels[currency]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

