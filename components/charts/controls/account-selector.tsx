"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Account } from "@/components/charts/types";

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccounts: string[];
  onAccountsChange: (accounts: string[]) => void;
  isLoading?: boolean;
}

export function AccountSelector({
  accounts,
  selectedAccounts,
  onAccountsChange,
  isLoading = false,
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full sm:w-[200px] justify-between"
          disabled={isLoading}
        >
          {selectedAccounts.length === accounts.length
            ? "All Accounts"
            : `${selectedAccounts.length} selected`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] sm:w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search accounts..." />
          <CommandEmpty>No account found.</CommandEmpty>
          <CommandGroup>
            {accounts.map((account) => (
              <CommandItem
                key={account.id}
                onSelect={() => {
                  onAccountsChange(
                    selectedAccounts.includes(account.id)
                      ? selectedAccounts.filter((id) => id !== account.id)
                      : [...selectedAccounts, account.id]
                  );
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedAccounts.includes(account.id)
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                {account.name} ({account.type})
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
