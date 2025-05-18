"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

export async function syncUserProfile() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { success: false, error: "No authenticated user found" };
    }

    const user = session.user;
    const email = user.email;
    const name = user.user_metadata?.full_name || user.user_metadata?.name;
    const avatarUrl = user.user_metadata?.avatar_url;

    if (!email) {
      return { success: false, error: "User has no email" };
    }

    // Check if user exists in DB
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    const existingUser = existingUsers[0];

    if (existingUser) {
      // Update user with latest metadata
      await db
        .update(users)
        .set({
          name: name || existingUser.name,
          avatarUrl: avatarUrl || existingUser.avatarUrl,
        })
        .where(eq(users.id, existingUser.id));
    } else {
      // Create new user
      await db.insert(users).values({
        email,
        name: name || null,
        avatarUrl: avatarUrl || null,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing user profile:", error);
    return { success: false, error: "Failed to sync user profile" };
  }
}
