import { db } from "@/db";
import { licensePlates } from "@/db/schema";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { desc } from "drizzle-orm";
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
    .select()
    .from(licensePlates)
    .orderBy(desc(licensePlates.createdAt))
    .limit(ITEMS_PER_PAGE)
    .offset(from);

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
