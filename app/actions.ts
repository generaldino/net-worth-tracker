"use server";

import { db } from "@/db";
import { licensePlates, reports, users } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { sql } from "drizzle-orm";
import { Provider } from "@supabase/supabase-js";
import { getSiteUrl } from "@/utils/site-url";

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

/**
 * Syncs user data from Supabase Auth to the database
 * Called after successful authentication
 */
export async function syncUserToDB() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    // Check if user exists in our database
    const existingUser = await db
      .select()
      .from(users)
      .where(sql`${users.email} = ${user.email}`)
      .limit(1);

    if (existingUser.length === 0) {
      // User doesn't exist, create new user
      await db.insert(users).values({
        id: user.id, // Use the Supabase user ID
        email: user.email!,
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      });

      return {
        success: true,
        message: "User created successfully",
        isNewUser: true,
      };
    }

    // User exists, check if we need to update any fields
    if (
      existingUser[0].id !== user.id ||
      (user.user_metadata?.full_name &&
        existingUser[0].name !== user.user_metadata.full_name)
    ) {
      await db
        .update(users)
        .set({
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            existingUser[0].name,
        })
        .where(sql`${users.email} = ${user.email}`);

      return {
        success: true,
        message: "User updated successfully",
        isNewUser: false,
      };
    }

    return { success: true, message: "User already exists", isNewUser: false };
  } catch (error) {
    console.error("Error syncing user to database:", error);
    return { success: false, error: "Failed to sync user data" };
  }
}

const signInWith = (provider: Provider) => async () => {
  try {
    const supabase = await createClient();
    const auth_callback_url = `${getSiteUrl()}/auth/callback`;
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
