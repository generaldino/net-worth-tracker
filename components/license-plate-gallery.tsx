"use client";
import { useState } from "react";
import type { LicensePlate } from "../types/license-plate";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { LicensePlateCard } from "./license-plate-card";
import { LicensePlateDialog } from "./license-plate-dialogie";

interface LicensePlateGalleryProps {
  licensePlates: LicensePlate[];
}

export function LicensePlateGallery({
  licensePlates,
}: LicensePlateGalleryProps) {
  const [selectedPlate, setSelectedPlate] = useState<LicensePlate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("dateAdded");

  const filteredPlates = licensePlates.filter(
    (plate) =>
      plate.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plate.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      plate.reporter.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedPlates = [...filteredPlates].sort((a, b) => {
    if (sortBy === "dateAdded") {
      return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    } else if (sortBy === "views") {
      return b.views - a.views;
    } else if (sortBy === "shares") {
      return b.shares - a.shares;
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
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
              <SelectItem value="views">Views</SelectItem>
              <SelectItem value="shares">Shares</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedPlates.map((plate) => (
          <LicensePlateCard
            key={plate.id}
            licensePlate={plate}
            onClick={() => setSelectedPlate(plate)}
          />
        ))}
      </div>

      {sortedPlates.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            No license plates found matching your search.
          </p>
        </div>
      )}

      {selectedPlate && (
        <LicensePlateDialog
          licensePlate={selectedPlate}
          open={!!selectedPlate}
          onOpenChange={() => setSelectedPlate(null)}
        />
      )}
    </div>
  );
}
