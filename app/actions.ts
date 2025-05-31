"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { sql } from "drizzle-orm";
import { Provider } from "@supabase/supabase-js";
import { getSiteUrl } from "@/utils/site-url";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

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
        avatarUrl: user.user_metadata?.avatar_url || null,
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
        existingUser[0].name !== user.user_metadata.full_name) ||
      (user.user_metadata?.avatar_url &&
        existingUser[0].avatarUrl !== user.user_metadata.avatar_url)
    ) {
      await db
        .update(users)
        .set({
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            existingUser[0].name,
          avatarUrl:
            user.user_metadata?.avatar_url || existingUser[0].avatarUrl,
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

/**
 * Gets a user from the database by email
 */
export async function getUserByEmail(email: string) {
  try {
    if (!email) {
      return { success: false, error: "Email is required" };
    }

    const user = await db
      .select()
      .from(users)
      .where(sql`${users.email} = ${email}`)
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      user: user[0],
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return { success: false, error: "Failed to fetch user data" };
  }
}

/**
 * Gets a user from the database by id
 */
export async function getUserById(id: string) {
  try {
    if (!id) {
      return { success: false, error: "Id is required" };
    }

    const user = await db
      .select()
      .from(users)
      .where(sql`${users.id} = ${id}`)
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      user: user[0],
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return { success: false, error: "Failed to fetch user data" };
  }
}

export async function getUserSession() {
  try {
    // Get the current user data directly from the database
    // First, get currently authenticated user ID from session cookie
    const cookieStore = await cookies();
    const supabaseAuthCookie = cookieStore.get("sb-supabase-auth-token");

    if (!supabaseAuthCookie?.value) {
      return { dbUser: null };
    }

    // Parse the cookie value to get the user ID
    try {
      const cookieData = JSON.parse(supabaseAuthCookie.value);
      const userId = cookieData[0]?.user?.id;

      if (!userId) {
        return { dbUser: null };
      }

      // Query the database directly with Drizzle ORM
      const dbUsers = await db
        .select()
        .from(users)
        .where(sql`${users.id} = ${userId}`)
        .limit(1);

      const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;
      return { dbUser };
    } catch (parseError) {
      console.error("Error parsing auth cookie:", parseError);
      return { dbUser: null };
    }
  } catch (error) {
    console.error("Error getting user session:", error);
    return { dbUser: null };
  }
}

export async function isUserAdmin() {
  const session = await auth();
  if (!session?.user) return false;

  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("isAdmin")
    .eq("id", session.user.id)
    .single();

  return user?.isAdmin === "true";
}
