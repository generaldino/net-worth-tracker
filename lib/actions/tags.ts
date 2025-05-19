import { db } from "@/db";
import { tags, licensePlateTags } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getTagsByLicensePlateId(licensePlateId: string) {
  const result = await db
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(licensePlateTags)
    .innerJoin(tags, eq(licensePlateTags.tagId, tags.id))
    .where(eq(licensePlateTags.licensePlateId, licensePlateId));

  return result;
}

export async function getAllTags() {
  const result = await db.select().from(tags);
  return result;
}

export async function createTag(name: string) {
  const result = await db
    .insert(tags)
    .values({
      name,
    })
    .returning();
  return result[0];
}

export async function addTagToLicensePlate(
  licensePlateId: string,
  tagId: string
) {
  const result = await db
    .insert(licensePlateTags)
    .values({
      licensePlateId,
      tagId,
    })
    .returning();
  return result[0];
}
