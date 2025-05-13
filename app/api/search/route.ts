import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { licensePlates } from "@/db/schema";
import { ilike, or, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get search term from URL params
    const searchParams = request.nextUrl.searchParams;
    const term = searchParams.get("q") || "";

    if (!term.trim()) {
      // Return limited plates if no search term
      const allPlates = await db.select().from(licensePlates).limit(20);
      return NextResponse.json({ plates: allPlates });
    }

    // Create the search term for ILIKE expressions
    const searchPattern = `%${term}%`;

    // Search for license plates that match the term
    // Leveraging PostgreSQL's array capabilities for tag search
    const searchResults = await db
      .select()
      .from(licensePlates)
      .where(
        or(
          ilike(licensePlates.plateNumber, searchPattern),
          ilike(licensePlates.reporter, searchPattern),
          ilike(licensePlates.category, searchPattern),
          ilike(licensePlates.caption, searchPattern),
          // Using PostgreSQL array operator to check if any tag contains the search term
          sql`EXISTS (SELECT 1 FROM unnest(${licensePlates.tags}) tag WHERE tag ILIKE ${searchPattern})`
        )
      )
      .limit(20);

    return NextResponse.json({ plates: searchResults });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
