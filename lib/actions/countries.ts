import { db } from "@/db";
import { countries } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Country } from "@/db/schema";

/**
 * Fetches a country by its ID
 */
export async function getCountryById(id: string): Promise<Country | null> {
  try {
    const [country] = await db
      .select()
      .from(countries)
      .where(eq(countries.id, id))
      .limit(1);

    return country || null;
  } catch (error) {
    console.error("Error fetching country:", error);
    return null;
  }
}

/**
 * Fetches all countries
 */
export async function getAllCountries(): Promise<Country[]> {
  try {
    const allCountries = await db
      .select()
      .from(countries)
      .orderBy(countries.name);

    return allCountries;
  } catch (error) {
    console.error("Error fetching countries:", error);
    return [];
  }
}
