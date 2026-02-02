"use server";

import { signOut as nextAuthSignOut } from "@/lib/auth";

export async function signOutAction() {
  await nextAuthSignOut({ redirectTo: "/" });
}
