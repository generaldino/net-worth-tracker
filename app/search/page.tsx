import { LicensePlateGallery } from "@/components/license-plate-gallery";
import { SearchBar } from "@/components/search-bar";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  return (
    <main className="container mx-auto py-10 px-4">
      <div className="mb-8 py-6 px-4 mx-auto max-w-2xl bg-primary/5 rounded-lg">
        <h1 className="text-3xl font-bold mb-2 text-center text-primary">
          Search License Plates
        </h1>
        <p className="text-muted-foreground text-center">
          Find license plates by plate number, description, or tags
        </p>
      </div>
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
