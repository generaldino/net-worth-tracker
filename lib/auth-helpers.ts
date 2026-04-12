"use server";

import { cache } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// cache() dedupes within a single RSC render pass. Many server actions call
// getUserId in the same page render — without this, auth() runs N times.
const _getSession = cache(async () => auth());

const _getUserId = cache(async () => {
  const session = await _getSession();
  if (!session?.user?.id) {
    redirect("/");
  }
  return session.user.id;
});

export async function getUserId() {
  return _getUserId();
}

export async function isAdmin() {
  const session = await _getSession();
  return session?.user?.isAdmin || false;
}
