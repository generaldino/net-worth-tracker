"use client";

import { ReactNode, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LicensePlateCard } from "@/components/license-plate-card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { LicensePlate } from "@/types/license-plate";
import { ITEMS_PER_PAGE } from "@/lib/constants";

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface LicensePlateGalleryProps {
  initialLicensePlates: LicensePlate[];
  initialPagination?: PaginationData;
  filterParams?: {
    type: string;
    value: string;
  };
}

export function LicensePlateGallery({
  initialLicensePlates,
  initialPagination,
  filterParams,
}: LicensePlateGalleryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [licensePlates, setLicensePlates] = useState<LicensePlate[]>(
    initialLicensePlates || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>(
    initialPagination || {
      total: initialLicensePlates.length,
      page: 1,
      pageSize: ITEMS_PER_PAGE,
      pageCount: Math.ceil(initialLicensePlates.length / ITEMS_PER_PAGE),
    }
  );

  // Create a URL for pagination
  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  // Create a debounced search function
  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    if (!term.trim()) {
      // Reset to initial state if search term is empty
      if (filterParams) {
        // If we're on a filter page, reload with the current filter
        fetchFilteredPlates(1);
      } else {
        // If we're on the home page, reload first page
        const queryParams = new URLSearchParams(searchParams);
        queryParams.delete("q");
        queryParams.set("page", "1");
        router.push(`${pathname}?${queryParams.toString()}`);
      }
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

      // Update plates and pagination
      setLicensePlates(Array.isArray(data.plates) ? data.plates : []);
      if (data.pagination) {
        setPagination(data.pagination);
      }

      // Update URL to reflect search
      const queryParams = new URLSearchParams(searchParams);
      queryParams.set("q", term);
      queryParams.set("page", "1");
      router.push(`${pathname}?${queryParams.toString()}`, { scroll: false });
    } catch (error) {
      console.error("Search error:", error);
      setLicensePlates([]);
      setPagination({
        total: 0,
        page: 1,
        pageSize: ITEMS_PER_PAGE,
        pageCount: 0,
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

  // Generate pagination items
  const generatePaginationItems = () => {
    const { page: currentPage, pageCount: totalPages } = pagination;
    const items: ReactNode[] = [];

    // Don't render pagination if there's only one page
    if (totalPages <= 1) {
      return items;
    }

    // For smaller number of pages, show all page numbers
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href={createPageURL(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // For larger number of pages, show select page numbers with ellipses

      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink href={createPageURL(1)} isActive={currentPage === 1}>
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if current page is not near the start
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-1">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Calculate range around current page
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      // Show pages around current page
      for (let i = startPage; i <= endPage; i++) {
        // Skip if already rendered (can happen near start/end)
        if (i === 1 || i === totalPages) continue;

        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href={createPageURL(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Show ellipsis if current page is not near the end
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Always show last page
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href={createPageURL(totalPages)}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
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

      {/* Pagination - using Shadcn UI pagination components directly */}
      {pagination.pageCount > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            {/* Previous button */}
            <PaginationItem>
              {pagination.page > 1 ? (
                <PaginationPrevious href={createPageURL(pagination.page - 1)} />
              ) : (
                <PaginationPrevious className="pointer-events-none opacity-50" />
              )}
            </PaginationItem>

            {/* Page numbers */}
            {generatePaginationItems()}

            {/* Next button */}
            <PaginationItem>
              {pagination.page < pagination.pageCount ? (
                <PaginationNext href={createPageURL(pagination.page + 1)} />
              ) : (
                <PaginationNext className="pointer-events-none opacity-50" />
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Results Summary */}
      {pagination.total > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
          {pagination.total} license plates
        </div>
      )}
    </div>
  );
}
