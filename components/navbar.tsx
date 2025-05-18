"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";
import { ShuffleButton } from "./shuffle-button";
import { GoogleSignInButton } from "./auth/google-signin-button";
import { SubmitPlateButton } from "./submit-plate-button";
import { ProfileDropdown } from "./auth/profile-dropdown";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { getUserByEmail, syncUserToDB } from "@/app/actions";
import { User as DbUser } from "@/db/schema";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);

        // Sync user to DB and get updated user data
        await syncUserToDB();

        // Get user from database using server action
        if (session.user.email) {
          const result = await getUserByEmail(session.user.email);
          if (result.success && result.user) {
            setDbUser(result.user as DbUser);
          }
        }
      }

      setLoading(false);

      // Set up auth state listener
      const {
        data: { subscription },
      } = await supabase.auth.onAuthStateChange(async (_event, session) => {
        setUser(session?.user || null);

        if (session?.user) {
          // Sync user to DB on auth state change
          await syncUserToDB();

          // Get user from database using server action
          if (session.user.email) {
            const result = await getUserByEmail(session.user.email);
            if (result.success && result.user) {
              setDbUser(result.user as DbUser);
            } else {
              setDbUser(null);
            }
          }
        } else {
          setDbUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    getUser();
  }, [supabase]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        {/* Logo */}
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/icon.svg"
              alt="We Spot Number Plates"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="hidden font-bold sm:inline-block">WSNP</span>
          </Link>
        </div>

        {/* Add shuffle button */}
        <div className="mr-4">
          <ShuffleButton />
        </div>

        {/* Spacer to push submit button to the right */}
        <div className="flex-1"></div>

        {/* Search button */}
        <div className="mr-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/search">
              <SearchIcon className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>
        </div>

        {/* Auth: Either Profile Dropdown or Sign In Button */}
        <div className="mr-4">
          {!loading &&
            (user ? (
              <ProfileDropdown
                name={
                  dbUser?.name ||
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name
                }
                email={user.email}
                avatarUrl={dbUser?.avatarUrl || user.user_metadata?.avatar_url}
              />
            ) : (
              <GoogleSignInButton />
            ))}
        </div>

        {/* Submit button */}
        <div>
          <SubmitPlateButton />
        </div>
      </div>
    </header>
  );
}
