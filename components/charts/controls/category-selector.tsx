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

const accountCategories = ["Cash", "Investments"];

interface CategorySelectorProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  isLoading?: boolean;
}

export function CategorySelector({
  selectedCategories,
  onCategoriesChange,
  isLoading = false,
}: CategorySelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Initialize with all categories selected if none are selected
  React.useEffect(() => {
    if (selectedCategories.length === 0) {
      onCategoriesChange(accountCategories);
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
          {selectedCategories.length === accountCategories.length
            ? "All Categories"
            : selectedCategories.length === 1
            ? selectedCategories[0]
            : `${selectedCategories.length} categories selected`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandEmpty>No category found.</CommandEmpty>
          <CommandGroup>
            {accountCategories.map((category) => (
              <CommandItem
                key={category}
                value={category}
                onSelect={() => {
                  onCategoriesChange(
                    selectedCategories.includes(category)
                      ? selectedCategories.filter((c) => c !== category)
                      : [...selectedCategories, category]
                  );
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedCategories.includes(category)
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                {category}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
