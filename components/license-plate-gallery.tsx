"use client";

import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { LicensePlateCard } from "@/components/license-plate-card";
import { Input } from "@/components/ui/input";
import type { LicensePlate } from "@/types/license-plate";

export function LicensePlateGallery({
  initialLicensePlates,
}: {
  initialLicensePlates: LicensePlate[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
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

      <div className="space-y-6">
        {licensePlates.map((plate) => (
          <LicensePlateCard
            key={plate.id}
            licensePlate={plate}
            searchTerm={searchTerm}
          />
        ))}
      </div>

      {licensePlates.length === 0 && !isLoading && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            No license plates found matching your search.
          </p>
        </div>
      )}

      {isLoading && licensePlates.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            Searching for license plates...
          </p>
        </div>
      )}
    </div>
  );
}
