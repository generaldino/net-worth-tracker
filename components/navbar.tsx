import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";
import { ShuffleButton } from "./shuffle-button";
import { SubmitPlateButton } from "./submit-plate-button";
import { NavbarAuth } from "@/components/navbar-auth";
import { createClient } from "@/utils/supabase/server";
import { getUserById } from "@/app/actions";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const dbUser = await getUserById(user?.id || "");

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
        <div className="">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/search">
              <SearchIcon className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>
        </div>

        {/* Auth Section */}
        <div className="mr-4">
          <NavbarAuth
            isAuthenticated={isAuthenticated}
            dbUser={dbUser.user || null}
          />
        </div>

        {/* Submit button */}
        <div>
          <SubmitPlateButton />
        </div>
      </div>
    </header>
  );
}
