"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

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
      .where(eq(users.email, email))
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
      .where(eq(users.id, id))
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
 * Check if the current user is an admin
 */
export async function isUserAdmin() {
  const session = await auth();
  if (!session?.user) return false;

  return session.user.isAdmin || false;
}
