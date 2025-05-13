// components/license-plate-gallery.tsx
"use client";

import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { LicensePlateCard } from "@/components/license-plate-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LicensePlate } from "@/types/license-plate";

export function LicensePlateGallery({
  initialLicensePlates,
}: {
  initialLicensePlates: LicensePlate[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("dateAdded");
  const [licensePlates, setLicensePlates] = useState<LicensePlate[]>(
    initialLicensePlates || []
  );
  const [isLoading, setIsLoading] = useState(false);

  // Create a debounced search function
  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    if (!term.trim()) {
      setLicensePlates(initialLicensePlates || []);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      // Make sure plates is an array before setting state
      setLicensePlates(Array.isArray(data.plates) ? data.plates : []);
    } catch (error) {
      console.error("Search error:", error);
      // Set to empty array on error
      setLicensePlates([]);
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

  // Apply sorting to plates - ensure licensePlates is an array before sorting
  const sortedPlates = Array.isArray(licensePlates)
    ? [...licensePlates].sort((a, b) => {
        switch (sortBy) {
          case "dateAdded":
            // Handle potential null dates
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          case "views":
            // Assuming you later add a views property
            return 0;
          case "shares":
            // Assuming you later add a shares property
            return 0;
          default:
            return 0;
        }
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
        <div className="flex-1 relative">
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
        <div className="w-full sm:w-48">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateAdded">Date Added</SelectItem>
              <SelectItem value="views">Most Viewed</SelectItem>
              <SelectItem value="shares">Most Shared</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-6">
        {sortedPlates.map((plate) => (
          <LicensePlateCard
            key={plate.id}
            licensePlate={plate}
            searchTerm={searchTerm}
          />
        ))}
      </div>

      {sortedPlates.length === 0 && !isLoading && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            No license plates found matching your search.
          </p>
        </div>
      )}

      {isLoading && sortedPlates.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            Searching for license plates...
          </p>
        </div>
      )}
    </div>
  );
}
