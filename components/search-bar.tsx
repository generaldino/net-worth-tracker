"use client";

import { useDebouncedCallback } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { LicensePlateGallery } from "@/components/license-plate-gallery";
import type { LicensePlate } from "@/types/license-plate";

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [searchResults, setSearchResults] = useState<{
    plates: LicensePlate[];
    pagination: PaginationData;
  }>({
    plates: [],
    pagination: {
      total: 0,
      page: 1,
      pageSize: 10,
      pageCount: 0,
    },
  });

  // Create a debounced search function
  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    if (!term.trim()) {
      // Reset to initial state if search term is empty
      const queryParams = new URLSearchParams(searchParams);
      queryParams.delete("q");
      queryParams.set("page", "1");
      router.push(`${pathname}?${queryParams.toString()}`);
      setSearchResults({
        plates: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: 10,
          pageCount: 0,
        },
      });
      setIsLoading(false);
      return;
    }

    try {
      // Always search from page 1 when searching
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(term)}&page=1`
      );
      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      // Update search results
      setSearchResults({
        plates: data.plates || [],
        pagination: data.pagination || {
          total: 0,
          page: 1,
          pageSize: 10,
          pageCount: 0,
        },
      });

      // Update URL to reflect search
      const queryParams = new URLSearchParams(searchParams);
      queryParams.set("q", term);
      queryParams.set("page", "1");
      router.push(`${pathname}?${queryParams.toString()}`, { scroll: false });
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults({
        plates: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: 10,
          pageCount: 0,
        },
      });
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
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto">
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
      </div>

      {searchParams.get("q") && (
        <LicensePlateGallery
          initialLicensePlates={searchResults.plates}
          initialPagination={searchResults.pagination}
          searchTerm={searchTerm}
        />
      )}
    </div>
  );
}
