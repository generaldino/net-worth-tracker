"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Dev bypass: Set DEV_USER_ID in .env.local to enable localhost auth bypass
// Example: DEV_USER_ID=your-user-uuid-here
const DEV_USER_ID = process.env.DEV_USER_ID;
const DEV_USER_EMAIL = process.env.DEV_USER_EMAIL || "dev@localhost.com";
const DEV_USER_NAME = process.env.DEV_USER_NAME || "Dev User";

/**
 * Check if we're in localhost/development and dev bypass is enabled
 */
function isDevBypassEnabled(): boolean {
  if (!DEV_USER_ID) {
    return false;
  }
  
  // Only allow in development
  const isDevelopment = process.env.NODE_ENV === "development";
  return isDevelopment;
}

// Get authenticated user session
export async function auth() {
  try {
    // Dev bypass: Return hardcoded user in localhost if enabled
    if (isDevBypassEnabled() && DEV_USER_ID) {
      console.log("🔓 Dev auth bypass enabled - using hardcoded user");
      
      const devUserId = DEV_USER_ID; // Type narrowing
      
      // Try to get the dev user from database, or return a mock user
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, devUserId))
          .limit(1);

        if (user) {
          return {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              avatarUrl: user.avatarUrl,
            },
          };
        }
      } catch {
        console.warn("Dev user not found in database, using mock user");
      }

      // Return mock user if not found in database
      return {
        user: {
          id: devUserId,
          email: DEV_USER_EMAIL,
          name: DEV_USER_NAME,
        },
      };
    }

    // Normal auth flow
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return null;
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email!))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}
