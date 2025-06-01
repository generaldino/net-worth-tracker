"use client";

import { ProfileDropdown } from "@/components/auth/profile-dropdown";

export function Navbar() {
  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="font-semibold text-base sm:text-lg">
          💰 Wealth Tracker
        </div>
        <ProfileDropdown />
      </div>
    </nav>
  );
}
