import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { licensePlates } from "@/db/schema";
import { desc, ilike, or, sql } from "drizzle-orm";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    // Get search term and page from URL params
    const searchParams = request.nextUrl.searchParams;
    const term = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);

    // Validate page parameter
    const validPage = page > 0 ? page : 1;

    // Calculate offset for pagination
    const offset = (validPage - 1) * ITEMS_PER_PAGE;

    // If no search term, return paginated plates
    if (!term.trim()) {
      const [allPlates, totalCount] = await Promise.all([
        db
          .select()
          .from(licensePlates)
          .orderBy(desc(licensePlates.createdAt))
          .limit(ITEMS_PER_PAGE)
          .offset(offset),
        db
          .select({ count: sql`count(*)` })
          .from(licensePlates)
          .then((result) => Number(result[0]?.count || 0)),
      ]);

      return NextResponse.json({
        plates: allPlates,
        pagination: {
          total: totalCount,
          page: validPage,
          pageSize: ITEMS_PER_PAGE,
          pageCount: Math.ceil(totalCount / ITEMS_PER_PAGE),
        },
      });
    }

    // Create the search term for ILIKE expressions
    const searchPattern = `%${term}%`;

    // Search for license plates that match the term with pagination
    const [searchResults, totalCount] = await Promise.all([
      db
        .select()
        .from(licensePlates)
        .where(
          or(
            ilike(licensePlates.plateNumber, searchPattern),
            ilike(licensePlates.reporter, searchPattern),
            ilike(licensePlates.caption, searchPattern),
            ilike(licensePlates.country, searchPattern),
            ilike(licensePlates.carMake, searchPattern),
            sql`EXISTS (SELECT 1 FROM unnest(${licensePlates.tags}) tag WHERE tag ILIKE ${searchPattern})`
          )
        )
        .orderBy(desc(licensePlates.createdAt))
        .limit(ITEMS_PER_PAGE)
        .offset(offset),

      db
        .select({ count: sql`count(*)` })
        .from(licensePlates)
        .where(
          or(
            ilike(licensePlates.plateNumber, searchPattern),
            ilike(licensePlates.reporter, searchPattern),
            ilike(licensePlates.caption, searchPattern),
            ilike(licensePlates.country, searchPattern),
            ilike(licensePlates.carMake, searchPattern),
            sql`EXISTS (SELECT 1 FROM unnest(${licensePlates.tags}) tag WHERE tag ILIKE ${searchPattern})`
          )
        )
        .then((result) => Number(result[0]?.count || 0)),
    ]);

    return NextResponse.json({
      plates: searchResults,
      pagination: {
        total: totalCount,
        page: validPage,
        pageSize: ITEMS_PER_PAGE,
        pageCount: Math.ceil(totalCount / ITEMS_PER_PAGE),
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
