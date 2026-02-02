import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Dev bypass configuration
const DEV_USER_ID = process.env.DEV_USER_ID;
const DEV_USER_EMAIL = process.env.DEV_USER_EMAIL || "dev@localhost.com";
const DEV_USER_NAME = process.env.DEV_USER_NAME || "Dev User";

function isDevBypassEnabled(): boolean {
  if (!DEV_USER_ID) return false;
  return process.env.NODE_ENV === "development";
}

// Create NextAuth instance
const nextAuth = NextAuth(authConfig);
export const { handlers, signIn, signOut } = nextAuth;

// Export auth function with dev bypass support
export async function auth() {
  // Dev bypass: Return hardcoded user in localhost if enabled
  if (isDevBypassEnabled() && DEV_USER_ID) {
    console.log("🔓 Dev auth bypass enabled");

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, DEV_USER_ID))
        .limit(1);

      if (user) {
        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatarUrl,
            isAdmin: user.isAdmin,
          },
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
    } catch {
      console.warn("Dev user not found, using mock");
    }

    // Return mock user
    return {
      user: {
        id: DEV_USER_ID,
        email: DEV_USER_EMAIL,
        name: DEV_USER_NAME,
        image: null,
        isAdmin: false,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // Normal NextAuth flow
  const session = await nextAuth.auth();
  return session;
}
