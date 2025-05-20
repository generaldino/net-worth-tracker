import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  licensePlates,
  categories,
  users,
  countries,
  carMakes,
  licensePlateTags,
  tags,
} from "@/db/schema";
import { desc, ilike, or, sql, eq } from "drizzle-orm";
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
          .select({
            id: licensePlates.id,
            plateNumber: licensePlates.plateNumber,
            createdAt: licensePlates.createdAt,
            countryId: licensePlates.countryId,
            country: countries.name,
            caption: licensePlates.caption,
            userId: licensePlates.userId,
            carMakeId: licensePlates.carMakeId,
            carMake: carMakes.name,
            categoryId: licensePlates.categoryId,
            reporter: users.name,
          })
          .from(licensePlates)
          .leftJoin(users, eq(licensePlates.userId, users.id))
          .leftJoin(countries, eq(licensePlates.countryId, countries.id))
          .leftJoin(carMakes, eq(licensePlates.carMakeId, carMakes.id))
          .orderBy(desc(licensePlates.createdAt))
          .limit(ITEMS_PER_PAGE)
          .offset(offset)
          .then((results) =>
            results.map((plate) => ({
              ...plate,
              reporter: plate.reporter || "Unknown",
            }))
          ),

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
        .select({
          id: licensePlates.id,
          plateNumber: licensePlates.plateNumber,
          createdAt: licensePlates.createdAt,
          countryId: licensePlates.countryId,
          country: countries.name,
          caption: licensePlates.caption,
          userId: licensePlates.userId,
          carMakeId: licensePlates.carMakeId,
          carMake: carMakes.name,
          categoryId: licensePlates.categoryId,
          reporter: users.name,
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
        .leftJoin(users, eq(licensePlates.userId, users.id))
        .leftJoin(countries, eq(licensePlates.countryId, countries.id))
        .leftJoin(carMakes, eq(licensePlates.carMakeId, carMakes.id))
        .leftJoin(
          licensePlateTags,
          eq(licensePlates.id, licensePlateTags.licensePlateId)
        )
        .leftJoin(tags, eq(licensePlateTags.tagId, tags.id))
        .where(
          or(
            ilike(licensePlates.plateNumber, searchPattern),
            ilike(users.name, searchPattern),
            ilike(licensePlates.caption, searchPattern),
            ilike(countries.name, searchPattern),
            ilike(carMakes.name, searchPattern),
            ilike(categories.name, searchPattern),
            ilike(tags.name, searchPattern)
          )
        )
        .orderBy(desc(licensePlates.createdAt))
        .limit(ITEMS_PER_PAGE)
        .offset(offset)
        .then((results) =>
          results.map((plate) => ({
            ...plate,
            reporter: plate.reporter || "Unknown",
          }))
        ),

      db
        .select({ count: sql`count(*)` })
        .from(licensePlates)
        .leftJoin(categories, eq(licensePlates.categoryId, categories.id))
        .leftJoin(users, eq(licensePlates.userId, users.id))
        .leftJoin(countries, eq(licensePlates.countryId, countries.id))
        .leftJoin(carMakes, eq(licensePlates.carMakeId, carMakes.id))
        .leftJoin(
          licensePlateTags,
          eq(licensePlates.id, licensePlateTags.licensePlateId)
        )
        .leftJoin(tags, eq(licensePlateTags.tagId, tags.id))
        .where(
          or(
            ilike(licensePlates.plateNumber, searchPattern),
            ilike(users.name, searchPattern),
            ilike(licensePlates.caption, searchPattern),
            ilike(countries.name, searchPattern),
            ilike(carMakes.name, searchPattern),
            ilike(categories.name, searchPattern),
            ilike(tags.name, searchPattern)
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
