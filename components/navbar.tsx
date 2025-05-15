"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CameraIcon } from "lucide-react";
import { ShuffleButton } from "./shuffle-button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        {/* Logo */}
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/icon.svg" // Replace with your actual logo
              alt="License Plate Gallery"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="hidden font-bold sm:inline-block">
              License Plate Gallery
            </span>
          </Link>
        </div>

        {/* Add shuffle button */}
        <div className="mr-4">
          <ShuffleButton />
        </div>

        {/* Spacer to push submit button to the right */}
        <div className="flex-1"></div>

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
