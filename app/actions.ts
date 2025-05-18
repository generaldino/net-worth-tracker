"use server";

import { db } from "@/db";
import { licensePlates, reports } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { sql } from "drizzle-orm";
import { Provider } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

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

const signInWith = (provider: Provider) => async () => {
  try {
    const supabase = await createClient();
    const auth_callback_url = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: auth_callback_url },
    });

    if (error) {
      console.error("Error signing in with", provider, error);
      return { error: "Failed to sign in" };
    }
    if (data.url) {
      return { data, error: null };
    }
  } catch (error) {
    console.error("Error signing in with", provider, error);
    return { error: "Failed to sign in" };
  }
};

const signinWithGoogle = signInWith("google");

export { signinWithGoogle };
