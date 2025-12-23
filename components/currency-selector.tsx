"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportedCurrencies, currencyLabels } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";

export type DisplayCurrency = Currency | "BASE";

interface CurrencySelectorProps {
  value: DisplayCurrency;
  onValueChange: (currency: DisplayCurrency) => void;
  label?: string;
}

export function CurrencySelector({
  value,
  onValueChange,
}: CurrencySelectorProps) {
  // Get display symbol for the current value
  const getDisplaySymbol = () => {
    if (value === "BASE") {
      return "£"; // Default to GBP symbol for BASE
    }
    return getCurrencySymbol(value);
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger size="sm" className="w-auto min-w-[40px] px-2">
        <SelectValue>
          <span className="text-sm font-medium">{getDisplaySymbol()}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="BASE">
          <span className="font-medium">£</span> Base Currency
        </SelectItem>
        {supportedCurrencies.map((currency) => (
          <SelectItem key={currency} value={currency}>
            <span className="font-medium">{getCurrencySymbol(currency)}</span> {currencyLabels[currency]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

