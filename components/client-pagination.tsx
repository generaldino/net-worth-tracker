"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LicensePlate } from "@/types/license-plate";

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface ClientPaginationProps {
  initialLicensePlates: LicensePlate[];
  initialPagination: PaginationData;
  filterParams?: {
    type: string;
    value: string;
  };
}

export function ClientPagination({
  initialLicensePlates,
  initialPagination,
  filterParams,
}: ClientPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [licensePlates, setLicensePlates] =
    useState<LicensePlate[]>(initialLicensePlates);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] =
    useState<PaginationData>(initialPagination);

  // Function to fetch filtered plates (for filter pages)
  const fetchFilteredPlates = async (page: number) => {
    if (!filterParams) return;

    setIsLoading(true);
    try {
      const { type, value } = filterParams;

      let endpoint = "";
      switch (type) {
        case "reporter":
          endpoint = `/api/filter/reporter?reporter=${encodeURIComponent(
            value
          )}&page=${page}`;
          break;
        case "tag":
          endpoint = `/api/filter/tag?tag=${encodeURIComponent(
            value
          )}&page=${page}`;
          break;
        case "category":
          endpoint = `/api/filter/category?category=${encodeURIComponent(
            value
          )}&page=${page}`;
          break;
        default:
          throw new Error("Invalid filter type");
      }

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Filter failed");

      const data = await response.json();
      setLicensePlates(Array.isArray(data.plates) ? data.plates : []);
      if (data.pagination) {
        setPagination(data.pagination);
      }

      // Update URL
      const queryParams = new URLSearchParams(searchParams);
      queryParams.set("page", page.toString());
      router.push(`${pathname}?${queryParams.toString()}`, { scroll: false });
    } catch (error) {
      console.error("Filter error:", error);
      setLicensePlates([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && licensePlates.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Loading license plates...</p>
      </div>
    );
  }

  return null; // This component doesn't render anything, it just provides functionality
}
