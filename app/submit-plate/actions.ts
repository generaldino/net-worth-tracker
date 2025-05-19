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
import { eq } from "drizzle-orm";

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
    const userIdFromForm = formData.get("userId") as string;
    const caption = formData.get("caption") as string;
    const tagNames = formData.getAll("tags") as string[];

    // Use the form's userId if present, otherwise use the session userId
    const userId = userIdFromForm || session.user.id;

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

    // Start a transaction
    await db.transaction(async (tx) => {
      // Create the license plate in the database
      await tx.insert(licensePlates).values({
        id: licensePlateId,
        plateNumber,
        countryId,
        carMakeId: carMakeId || null,
        categoryId,
        caption: caption || null,
        imageUrls,
        userId: userId,
        createdAt: new Date(),
      });

      // Create tags and link them to the license plate
      for (const tagName of tagNames) {
        // First, try to find an existing tag
        const [existingTag] = await tx
          .select()
          .from(tags)
          .where(eq(tags.name, tagName))
          .limit(1);

        let tagId: string;
        if (existingTag) {
          tagId = existingTag.id;
        } else {
          // Create a new tag if it doesn't exist
          const [newTag] = await tx
            .insert(tags)
            .values({
              name: tagName,
            })
            .returning();
          tagId = newTag.id;
        }

        // Link the tag to the license plate
        await tx.insert(licensePlateTags).values({
          licensePlateId,
          tagId,
        });
      }
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
