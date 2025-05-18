import { SearchBar } from "@/components/search-bar";
import { db } from "@/db";
import { licensePlates, categories } from "@/db/schema";
import { desc, ilike, or, sql, eq } from "drizzle-orm";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import type { LicensePlate } from "@/types/license-plate";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchTerm = resolvedSearchParams.q || "";
  const page = parseInt(resolvedSearchParams.page || "1", 10);
  const validPage = page > 0 ? page : 1;

  let searchResults = {
    plates: [] as LicensePlate[],
    pagination: {
      total: 0,
      page: validPage,
      pageSize: ITEMS_PER_PAGE,
      pageCount: 0,
    },
  };

  // Only fetch results if there's a search term
  if (searchTerm) {
    const offset = (validPage - 1) * ITEMS_PER_PAGE;
    const searchPattern = `%${searchTerm}%`;

    // Search for license plates that match the term with pagination
    const [results, totalCount] = await Promise.all([
      db
        .select({
          id: licensePlates.id,
          plateNumber: licensePlates.plateNumber,
          createdAt: licensePlates.createdAt,
          country: licensePlates.country,
          caption: licensePlates.caption,
          imageUrls: licensePlates.imageUrls,
          tags: licensePlates.tags,
          reporter: licensePlates.userId,
          carMake: licensePlates.carMake,
          categoryId: licensePlates.categoryId,
          category: {
            id: categories.id,
            name: categories.name,
            emoji: categories.emoji,
            color: categories.color,
            description: categories.description,
          },
        })
        .from(licensePlates)
        .leftJoin(categories, eq(licensePlates.categoryId, categories.id))
        .where(
          or(
            ilike(licensePlates.plateNumber, searchPattern),
            ilike(licensePlates.userId, searchPattern),
            ilike(licensePlates.caption, searchPattern),
            ilike(licensePlates.country, searchPattern),
            ilike(licensePlates.carMake, searchPattern),
            ilike(categories.name, searchPattern),
            sql`EXISTS (SELECT 1 FROM unnest(${licensePlates.tags}) tag WHERE tag ILIKE ${searchPattern})`
          )
        )
        .orderBy(desc(licensePlates.createdAt))
        .limit(ITEMS_PER_PAGE)
        .offset(offset),

      db
        .select({ count: sql`count(*)` })
        .from(licensePlates)
        .leftJoin(categories, eq(licensePlates.categoryId, categories.id))
        .where(
          or(
            ilike(licensePlates.plateNumber, searchPattern),
            ilike(licensePlates.userId, searchPattern),
            ilike(licensePlates.caption, searchPattern),
            ilike(licensePlates.country, searchPattern),
            ilike(licensePlates.carMake, searchPattern),
            ilike(categories.name, searchPattern),
            sql`EXISTS (SELECT 1 FROM unnest(${licensePlates.tags}) tag WHERE tag ILIKE ${searchPattern})`
          )
        )
        .then((result) => Number(result[0]?.count || 0)),
    ]);

    // The database query returns more fields than our LicensePlate type definition
    // Extract just the fields we need for our LicensePlate type
    const plates = results.map((result) => ({
      id: result.id,
      plateNumber: result.plateNumber,
      createdAt: result.createdAt,
      country: result.country,
      caption: result.caption,
      imageUrls: result.imageUrls,
      tags: result.tags,
      userId: result.userId,
      carMake: result.carMake,
      categoryId: result.categoryId,
      reporter: result.userId,
    }));

    searchResults = {
      plates,
      pagination: {
        total: totalCount,
        page: validPage,
        pageSize: ITEMS_PER_PAGE,
        pageCount: Math.ceil(totalCount / ITEMS_PER_PAGE),
      },
    };
  }

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
      <SearchBar
        searchParams={resolvedSearchParams}
        initialData={searchResults}
      />
    </main>
  );
}
