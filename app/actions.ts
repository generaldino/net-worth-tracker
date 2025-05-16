"use server";

import { db } from "@/db";
import { licensePlates, reports } from "@/db/schema";
import { sql } from "drizzle-orm";

/**
 * Server action that fetches a random license plate and redirects to its page
 */
export async function getRandomLicensePlate() {
  try {
    // Query to select a random license plate
    const [randomPlate] = await db
      .select({
        plateNumber: licensePlates.plateNumber,
      })
      .from(licensePlates)
      .orderBy(sql`RANDOM()`) // PostgreSQL's RANDOM() function
      .limit(1);

    if (!randomPlate) {
      // Fallback if no plates are found
      return { success: false, error: "No license plates found" };
    }

    // Return the plate number
    return { success: true, plateNumber: randomPlate.plateNumber };
  } catch (error) {
    console.error("Error fetching random license plate:", error);
    return { success: false, error: "Failed to fetch random plate" };
  }
}

export async function submitReport(formData: {
  licensePlateId: string;
  reportType: string;
  description?: string;
}) {
  try {
    const { licensePlateId, reportType, description } = formData;

    // Validate required fields
    if (!licensePlateId || !reportType) {
      return {
        error: "Missing required fields",
      };
    }

    // Create the report
    await db.insert(reports).values({
      licensePlateId,
      reportType,
      description: description || null,
    });

    return {
      success: true,
      message: "Report submitted successfully",
    };
  } catch (error) {
    console.error("Error creating report:", error);
    return {
      error: "Failed to create report",
    };
  }
}
