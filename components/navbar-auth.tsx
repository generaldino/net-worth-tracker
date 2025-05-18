"use client";

import { GoogleSignInButton } from "./auth/google-signin-button";
import { ProfileDropdown } from "./auth/profile-dropdown";
import { User as DbUser } from "@/db/schema";

type NavbarAuthProps = {
  isAuthenticated: boolean;
  dbUser: DbUser | null;
};

export function NavbarAuth({ dbUser }: NavbarAuthProps) {
  if (!dbUser) {
    return;
  }

  return (
    <ProfileDropdown
      name={dbUser.name || "User"}
      email={dbUser.email}
      avatarUrl={dbUser.avatarUrl}
    />
  );
}
