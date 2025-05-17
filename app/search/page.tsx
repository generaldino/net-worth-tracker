import { LicensePlateGallery } from "@/components/license-plate-gallery";
import { SearchBar } from "@/components/search-bar";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  return (
    <main className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Search License Plates</h1>
      <div className="mb-8">
        <SearchBar />
      </div>
      {searchParams.q ? (
        <LicensePlateGallery
          initialLicensePlates={[]}
          initialPagination={{
            total: 0,
            page: searchParams.page ? parseInt(searchParams.page) : 1,
            pageSize: 10,
            pageCount: 0,
          }}
        />
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            Enter a search term to find license plates
          </p>
        </div>
      )}
    </main>
  );
}
