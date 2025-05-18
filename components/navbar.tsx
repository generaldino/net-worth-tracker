"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CameraIcon, SearchIcon } from "lucide-react";
import { ShuffleButton } from "./shuffle-button";
import { ButtonSignIn } from "./ButtonSignIn";
import { useSession } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();

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

        {/* Auth button */}
        <div className="mr-4">
          {session ? (
            <Button variant="ghost">
              {session.user?.name || session.user?.email}
            </Button>
          ) : (
            <ButtonSignIn />
          )}
        </div>

        {/* Submit button */}
        <div>
          <Button>
            <CameraIcon className="mr-2 h-4 w-4" />
            <span>Submit Plate</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
