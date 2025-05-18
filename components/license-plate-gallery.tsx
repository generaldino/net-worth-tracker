import { ReactNode } from "react";
import { LicensePlateCard } from "@/components/license-plate-card";
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
  searchTerm?: string;
  currentPath: string; // Pass the current path from server component
}

export function LicensePlateGallery({
  initialLicensePlates,
  initialPagination,
  searchTerm = "",
  currentPath,
}: LicensePlateGalleryProps) {
  const pagination = initialPagination || {
    total: initialLicensePlates.length,
    page: 1,
    pageSize: ITEMS_PER_PAGE,
    pageCount: Math.ceil(initialLicensePlates.length / ITEMS_PER_PAGE),
  };

  // Create a URL for pagination
  const createPageURL = (pageNumber: number) => {
    // Create URL on the server-side
    const searchParams = new URLSearchParams();
    searchParams.set("page", pageNumber.toString());
    return `${currentPath}?${searchParams.toString()}`;
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
      <div className="space-y-6">
        {initialLicensePlates.map((plate) => (
          <LicensePlateCard
            key={plate.id}
            licensePlate={plate}
            searchTerm={searchTerm}
          />
        ))}
      </div>

      {initialLicensePlates.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No license plates found.</p>
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
