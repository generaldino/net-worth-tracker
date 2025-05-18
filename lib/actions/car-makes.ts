import { db } from "@/db";
import { carMakes } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { CarMake } from "@/db/schema";

/**
 * Fetches a car make by its ID
 */
export async function getCarMakeById(id: string): Promise<CarMake | null> {
  try {
    const [carMake] = await db
      .select()
      .from(carMakes)
      .where(eq(carMakes.id, id))
      .limit(1);

    return carMake || null;
  } catch (error) {
    console.error("Error fetching car make:", error);
    return null;
  }
}

/**
 * Fetches all car makes
 */
export async function getAllCarMakes(): Promise<CarMake[]> {
  try {
    const allCarMakes = await db.select().from(carMakes).orderBy(carMakes.name);

    return allCarMakes;
  } catch (error) {
    console.error("Error fetching car makes:", error);
    return [];
  }
}
