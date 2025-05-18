"use client";

import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";

interface ProfileDropdownProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export function ProfileDropdown({
  name,
  email,
  avatarUrl,
}: ProfileDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [imageError, setImageError] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <div className="relative h-full w-full">
            {avatarUrl && !imageError ? (
              <Image
                src={avatarUrl}
                alt={name || "User"}
                width={32}
                height={32}
                className="h-full w-full object-cover"
                priority={true}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
                {initials}
              </div>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {name && <p className="font-medium">{name}</p>}
            {email && <p className="text-sm text-muted-foreground">{email}</p>}
          </div>
        </div>
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
