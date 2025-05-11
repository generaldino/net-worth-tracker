"use client";

import { useState } from "react";
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
  licensePlates,
}: {
  licensePlates: LicensePlate[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("dateAdded");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
        <div className="flex-1">
          <Input
            placeholder="Search by plate number, tag, or reporter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
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
        {licensePlates.map((plate) => (
          <LicensePlateCard key={plate.id} licensePlate={plate} />
        ))}
      </div>

      {licensePlates.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            No license plates found matching your search.
          </p>
        </div>
      )}
    </div>
  );
}
