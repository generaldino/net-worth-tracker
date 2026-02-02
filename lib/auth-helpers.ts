"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getUserId() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return session.user.id;
}

export async function isAdmin() {
  const session = await auth();
  return session?.user?.isAdmin || false;
}
