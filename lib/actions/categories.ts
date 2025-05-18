"use server";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCategoryById(categoryId: string) {
  try {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId));

    if (!category) {
      return null;
    }

    return category;
  } catch (error) {
    console.error("Error fetching category:", error);
    return null;
  }
}
