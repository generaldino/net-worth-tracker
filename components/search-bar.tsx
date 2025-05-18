import { LicensePlateGallery } from "@/components/license-plate-gallery";

import { Suspense } from "react";
import type { LicensePlate } from "@/types/license-plate";
import { SearchInput } from "@/components/search-input";

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface SearchBarProps {
  searchParams: {
    q?: string;
    page?: string;
  };
  initialData?: {
    plates: LicensePlate[];
    pagination: PaginationData;
  };
}

export function SearchBar({ searchParams, initialData }: SearchBarProps) {
  const searchTerm = searchParams.q || "";

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto">
        <SearchInput initialSearchTerm={searchTerm} />
      </div>

      {searchParams.q && (
        <Suspense
          fallback={<div className="text-center py-10">Loading results...</div>}
        >
          <LicensePlateGallery
            initialLicensePlates={initialData?.plates || []}
            initialPagination={initialData?.pagination}
            searchTerm={searchTerm}
            currentPath="/search"
          />
        </Suspense>
      )}
    </div>
  );
}
