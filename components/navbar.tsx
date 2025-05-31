"use client";

import { ProfileDropdown } from "@/components/auth/profile-dropdown";
import { auth } from "@/lib/auth";

export function Navbar() {
  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="font-semibold text-lg">💰 Wealth Tracker</div>
        <ProfileDropdown />
      </div>
    </nav>
  );
}
