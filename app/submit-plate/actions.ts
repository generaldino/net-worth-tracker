"use server";

import { db } from "@/db";
import {
  categories,
  countries,
  carMakes,
  licensePlates,
  users,
  tags,
  licensePlateTags,
  images,
} from "@/db/schema";

import { revalidatePath } from "next/cache";

import { v4 as uuidv4 } from "uuid";
import { desc } from "drizzle-orm";
import { uploadToGoogleCloudStorage } from "@/lib/google-cloud-storage";

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

// Fetch all users from the database
export async function getUsers() {
  try {
    const allUsers = await db.select().from(users);

    return {
      users: allUsers,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      users: [],
      error: "Failed to fetch users",
    };
  }
}

// Fetch all tags from the database
export async function getTags() {
  try {
    const allTags = await db.select().from(tags).orderBy(desc(tags.createdAt));
    return { tags: allTags };
  } catch (error) {
    console.error("Error fetching tags:", error);
    return { tags: [] };
  }
}

// Helper function to save image data
async function saveImageToStorage(file: File): Promise<string | null> {
  try {
    // Convert File to ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Upload to Google Cloud Storage
    const imageUrl = await uploadToGoogleCloudStorage(
      Buffer.from(buffer),
      file.name
    );

    if (!imageUrl) {
      throw new Error("Failed to upload image to Google Cloud Storage");
    }

    return imageUrl;
  } catch (error) {
    console.error("Error processing image:", error);
    return null;
  }
}

// Submit license plate form
export async function submitLicensePlate(formData: FormData) {
  try {
    // Extract form data
    const plateNumber = formData.get("plateNumber") as string;
    const countryId = formData.get("countryId") as string;
    const categoryId = formData.get("categoryId") as string;
    const carMakeId = formData.get("carMakeId") as string;
    const userId = formData.get("userId") as string;
    const caption = formData.get("caption") as string;
    const tagIdsArray = formData.getAll("tagIds") as string[];
    const imageFiles = formData.getAll("images") as File[];

    // Insert license plate data
    const [licensePlateResult] = await db
      .insert(licensePlates)
      .values({
        plateNumber,
        countryId: countryId || null,
        categoryId,
        carMakeId: carMakeId || null,
        userId,
        caption: caption || null,
        createdAt: new Date(),
      })
      .returning();

    if (!licensePlateResult) {
      throw new Error("Failed to insert license plate");
    }

    const licensePlateId = licensePlateResult.id;

    // Process tags if any
    if (tagIdsArray.length > 0) {
      const tagInserts = tagIdsArray.map((tagId) => ({
        id: uuidv4(),
        licensePlateId,
        tagId,
      }));

      await db.insert(licensePlateTags).values(tagInserts);
    }

    // Process and save images
    const imagePromises = imageFiles.map(async (file) => {
      // Save image file to storage and get URL
      const imageUrl = await saveImageToStorage(file);

      if (!imageUrl) return null;

      // Save image record in database using Drizzle
      const [imageRecord] = await db
        .insert(images)
        .values({
          url: imageUrl,
          licensePlateId,
        })
        .returning();

      return imageRecord;
    });

    // Wait for all image processing to complete
    await Promise.all(imagePromises);

    // Revalidate paths
    revalidatePath("/");
    revalidatePath(`/${encodeURIComponent(plateNumber)}`);

    return { success: true, plateNumber, licensePlateId };
  } catch (error) {
    console.error("Error submitting license plate:", error);
    return { success: false, error: (error as Error).message };
  }
}
