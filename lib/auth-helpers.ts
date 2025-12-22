"use server";

import { createClient } from "@/utils/supabase/server";

// Dev bypass: Set DEV_USER_ID in .env.local to enable localhost auth bypass
const DEV_USER_ID = process.env.DEV_USER_ID;

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

/**
 * Get the current user ID, with dev bypass support
 * Use this in server actions that need the user ID
 */
export async function getUserId(): Promise<string | null> {
  if (isDevBypassEnabled()) {
    console.log("🔓 Dev auth bypass: using hardcoded user ID");
    return DEV_USER_ID || null;
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user?.id || null;
}

/**
 * Get the full session, with dev bypass support
 * Use this in server actions that need the full session
 */
export async function getSession() {
  if (isDevBypassEnabled()) {
    console.log("🔓 Dev auth bypass: using mock session");
    return {
      user: {
        id: DEV_USER_ID!,
        email: process.env.DEV_USER_EMAIL || "dev@localhost.com",
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

