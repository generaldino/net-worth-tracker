import { db } from "@/db";
import { images } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getImagesByLicensePlateId(licensePlateId: string) {
  try {
    const imageResults = await db
      .select()
      .from(images)
      .where(eq(images.licensePlateId, licensePlateId));

    return imageResults;
  } catch (error) {
    console.error("Error fetching images:", error);
    return [];
  }
}

export async function addImageToLicensePlate(
  licensePlateId: string,
  url: string
) {
  try {
    const result = await db
      .insert(images)
      .values({
        licensePlateId,
        url,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Error adding image:", error);
    return null;
  }
}
