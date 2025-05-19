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
} from "@/db/schema";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { uploadMultipleFiles } from "@/lib/google-cloud-storage";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";

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

// Submit license plate form
export async function submitLicensePlate(formData: FormData) {
  try {
    // Get form data
    const plateNumber = formData.get("plateNumber") as string;
    const countryId = formData.get("countryId") as string;
    const categoryId = formData.get("categoryId") as string;
    const carMakeId = formData.get("carMakeId") as string;
    const userId = formData.get("userId") as string;
    const caption = formData.get("caption") as string;
    const tagIds = formData.getAll("tagIds") as string[];
    const images = formData.getAll("images") as File[];

    // Validate required fields
    if (!plateNumber || !countryId || !categoryId || !carMakeId || !userId) {
      throw new Error("Missing required fields");
    }

    // Prepare files for upload - convert Files to Buffers
    const files = await Promise.all(
      images.map(async (file) => {
        const buffer = await file.arrayBuffer();
        return {
          buffer: Buffer.from(buffer),
          originalname: file.name,
        };
      })
    );

    // Upload images to Google Cloud Storage
    const imageUrls = await uploadMultipleFiles(files);

    // Create license plate
    const [licensePlate] = await db
      .insert(licensePlates)
      .values({
        id: uuidv4(),
        plateNumber,
        countryId,
        categoryId,
        carMakeId,
        userId,
        caption,
        imageUrls,
        createdAt: new Date(),
      })
      .returning();

    // Add tags if any
    if (tagIds.length > 0) {
      await db.insert(licensePlateTags).values(
        tagIds.map((tagId) => ({
          id: uuidv4(),
          licensePlateId: licensePlate.id,
          tagId,
          createdAt: new Date(),
        }))
      );
    }

    return { success: true, licensePlate };
  } catch (error) {
    console.error("Error submitting license plate:", error);
    throw error;
  }
}
