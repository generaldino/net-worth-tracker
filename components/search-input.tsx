"use client";

import { useDebouncedCallback } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface SearchInputProps {
  initialSearchTerm: string;
}

export function SearchInput({ initialSearchTerm }: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  // Create a debounced search function
  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    if (!term.trim()) {
      // Reset to initial state if search term is empty
      const queryParams = new URLSearchParams(searchParams);
      queryParams.delete("q");
      queryParams.set("page", "1");
      router.push(`${pathname}?${queryParams.toString()}`);
      setIsLoading(false);
      return;
    }

    try {
      // Update URL to reflect search
      const queryParams = new URLSearchParams(searchParams);
      queryParams.set("q", term);
      queryParams.set("page", "1");
      router.push(`${pathname}?${queryParams.toString()}`, { scroll: false });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, 350); // 350ms debounce time

  // Handle input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsLoading(true);
    debouncedSearch(value);
  };

  return (
    <div className="relative">
      <Input
        placeholder="Search by plate number, tag, or reporter..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="w-full"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
