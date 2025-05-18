"use server";

import { db } from "@/db";
import { categories, countries, carMakes, licensePlates } from "@/db/schema";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

// Fetch all categories from the database
export async function getCategories() {
  try {
    const allCategories = await db.select().from(categories);
    return { categories: allCategories };
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return { categories: [] };
  }
}

// Fetch all countries from the database
export async function getCountries() {
  try {
    const allCountries = await db.select().from(countries);
    return { countries: allCountries };
  } catch (error) {
    console.error("Failed to fetch countries:", error);
    return { countries: [] };
  }
}

// Fetch all car makes from the database
export async function getCarMakes() {
  try {
    const allCarMakes = await db.select().from(carMakes);
    return { carMakes: allCarMakes };
  } catch (error) {
    console.error("Failed to fetch car makes:", error);
    return { carMakes: [] };
  }
}

// Submit license plate form
export async function submitLicensePlate(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to submit a license plate",
    };
  }

  const schema = z.object({
    plateNumber: z.string().min(2),
    countryId: z.string().uuid(),
    carMakeId: z.string().uuid().optional(),
    categoryId: z.string().uuid(),
    caption: z.string().min(5),
    // For the actual implementation, image handling would be more complex
    // This is a simplified version
    images: z.array(z.any()).min(1).max(5),
    tags: z.array(z.string()).default([]),
  });

  try {
    // Extract form data
    const plateNumber = formData.get("plateNumber") as string;
    const countryId = formData.get("countryId") as string;
    const carMakeId = formData.get("carMakeId") as string;
    const categoryId = formData.get("categoryId") as string;
    const caption = formData.get("caption") as string;

    // Tags would need to be extracted from a more complex UI component
    // This is just a placeholder
    const tags = formData.getAll("tags") as string[];

    // In a real implementation, you would:
    // 1. Upload images to a storage service (e.g. Supabase Storage)
    // 2. Get the URLs of the uploaded images
    // Here we're just simulating this process
    const imageUrls = ["https://example.com/placeholder-image.jpg"];

    // Create the license plate in the database
    await db.insert(licensePlates).values({
      plateNumber,
      countryId,
      carMakeId: carMakeId || null,
      categoryId,
      caption,
      tags,
      imageUrls,
      userId: session.user.id,
    });

    // Revalidate relevant paths
    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to submit license plate:", error);
    return { success: false, error: "Failed to submit license plate" };
  }
}
