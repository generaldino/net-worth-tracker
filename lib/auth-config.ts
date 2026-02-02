import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import {
  nextAuthAccounts,
  nextAuthSessions,
  nextAuthVerificationTokens,
  users
} from "@/db/schema";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: nextAuthAccounts,
    sessionsTable: nextAuthSessions,
    verificationTokensTable: nextAuthVerificationTokens,
  }),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async session({ session, user }) {
      // Include user ID and isAdmin in session
      if (user) {
        session.user.id = user.id;
        session.user.isAdmin = user.isAdmin || false;
      }
      return session;
    },
  },

  pages: {
    signIn: "/",
  },

  session: {
    strategy: "database" as const,
  },

  debug: false, // Disable debug logs to reduce console noise
} satisfies NextAuthConfig;
