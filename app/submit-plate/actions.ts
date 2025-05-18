"use server";

import { db } from "@/db";
import { categories, countries, carMakes, licensePlates } from "@/db/schema";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { uploadMultipleFiles } from "@/lib/google-cloud-storage";
import { v4 as uuidv4 } from "uuid";

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

  try {
    // Extract form data
    const plateNumber = formData.get("plateNumber") as string;
    const countryId = formData.get("countryId") as string;
    const carMakeId = formData.get("carMakeId") as string;
    const categoryId = formData.get("categoryId") as string;
    const caption = formData.get("caption") as string;
    const tags = formData.getAll("tags") as string[];

    // Handle image uploads
    const imageFiles = formData.getAll("images") as File[];

    // Prepare files for upload - convert Files to Buffers
    const files = await Promise.all(
      imageFiles.map(async (file) => {
        const buffer = await file.arrayBuffer();
        return {
          buffer: Buffer.from(buffer),
          originalname: file.name,
        };
      })
    );

    // Upload images to Google Cloud Storage
    const imageUrls = await uploadMultipleFiles(files);

    // Generate a unique ID for the license plate
    const licensePlateId = uuidv4();

    // Create the license plate in the database
    await db.insert(licensePlates).values({
      id: licensePlateId,
      plateNumber,
      countryId,
      carMakeId: carMakeId || null,
      categoryId,
      caption: caption || null,
      tags,
      imageUrls,
      userId: session.user.id,
      createdAt: new Date(), // Explicitly set the created_at timestamp
    });

    // Revalidate relevant paths
    revalidatePath("/");
    revalidatePath(`/${encodeURIComponent(plateNumber)}`);

    return {
      success: true,
      licensePlateId: licensePlateId,
      plateNumber: plateNumber,
    };
  } catch (error) {
    console.error("Failed to submit license plate:", error);
    return { success: false, error: "Failed to submit license plate" };
  }
}
