"use client";

import { GoogleSignInButton } from "./auth/google-signin-button";
import { ProfileDropdown } from "./auth/profile-dropdown";
import { User as DbUser } from "@/db/schema";

type NavbarAuthProps = {
  isAuthenticated: boolean;
  dbUser: DbUser | null;
};

export function NavbarAuth({ isAuthenticated, dbUser }: NavbarAuthProps) {
  // Log all dbUser properties
  console.log("NavbarAuth dbUser:", dbUser);
  console.log("Avatar URL from dbUser:", dbUser?.avatarUrl);

  return isAuthenticated && dbUser ? (
    <ProfileDropdown
      name={dbUser.name || "User"}
      email={dbUser.email}
      avatarUrl={dbUser.avatarUrl}
    />
  ) : (
    <GoogleSignInButton />
  );
}
