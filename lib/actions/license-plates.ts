import { db } from "@/db";
import { licensePlates, countries, users } from "@/db/schema";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function getLicensePlates(page = 1) {
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(licensePlates);

  // Get paginated plates
  const plates = await db
    .select({
      id: licensePlates.id,
      plateNumber: licensePlates.plateNumber,
      createdAt: licensePlates.createdAt,
      countryId: licensePlates.countryId,
      country: countries.name, // Join with countries table
      caption: licensePlates.caption,
      imageUrls: licensePlates.imageUrls,
      tags: licensePlates.tags,
      userId: licensePlates.userId,
      carMake: licensePlates.carMake,
      categoryId: licensePlates.categoryId,
      reporter: users.name,
    })
    .from(licensePlates)
    .leftJoin(users, eq(licensePlates.userId, users.id))
    .leftJoin(countries, eq(licensePlates.countryId, countries.id)) // Left join to get country info
    .orderBy(desc(licensePlates.createdAt))
    .limit(ITEMS_PER_PAGE)
    .offset(from)
    .then((results) =>
      results.map((plate) => ({
        ...plate,
        reporter: plate.reporter || "Unknown",
      }))
    );

  const pageCount = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0;

  return {
    plates: plates || [],
    pagination: {
      total: count || 0,
      page,
      pageSize: ITEMS_PER_PAGE,
      pageCount,
    },
  };
}
