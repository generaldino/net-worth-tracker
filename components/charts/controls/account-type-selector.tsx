"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { accountTypes } from "@/lib/types";

interface AccountTypeSelectorProps {
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  isLoading?: boolean;
}

export function AccountTypeSelector({
  selectedTypes,
  onTypesChange,
  isLoading = false,
}: AccountTypeSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Initialize with all types selected if none are selected
  React.useEffect(() => {
    if (selectedTypes.length === 0) {
      onTypesChange(accountTypes);
    }
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          disabled={isLoading}
        >
          {selectedTypes.length === accountTypes.length
            ? "All Account Types"
            : selectedTypes.length === 1
            ? selectedTypes[0]
            : `${selectedTypes.length} types selected`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search account type..." />
          <CommandEmpty>No account type found.</CommandEmpty>
          <CommandGroup>
            {accountTypes.map((type) => (
              <CommandItem
                key={type}
                value={type}
                onSelect={() => {
                  onTypesChange(
                    selectedTypes.includes(type)
                      ? selectedTypes.filter((t) => t !== type)
                      : [...selectedTypes, type]
                  );
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedTypes.includes(type) ? "opacity-100" : "opacity-0"
                  )}
                />
                {type}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
