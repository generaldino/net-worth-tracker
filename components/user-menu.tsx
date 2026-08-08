"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Image from "next/image";
import {
  Wallet,
  Users,
  Coins,
  LogOut,
  Monitor,
  Sun,
  Moon,
  Banknote,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/auth";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { supportedCurrencies, currencyLabels } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

/**
 * Avatar menu in the top bar. Everything that isn't one of the two screens
 * or the check-in lives here: account admin, sharing, FX rates, display
 * currency, theme, sign out.
 */
export function UserMenu({ name, email, avatarUrl }: UserMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const [imageError, setImageError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "U";

  const themeOptions = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  // Legacy "BASE" cookie value behaves as GBP; show it as such.
  const currentCurrency: Currency =
    displayCurrency === "BASE" ? "GBP" : displayCurrency;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Account menu"
        >
          <span className="flex size-8 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {avatarUrl && !imageError ? (
              <Image
                src={avatarUrl}
                alt={name || "User"}
                width={32}
                height={32}
                className="size-full object-cover"
                priority
                onError={() => setImageError(true)}
              />
            ) : (
              <span className="text-xs font-medium">{initials}</span>
            )}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="grid gap-0.5">
            <span className="truncate text-sm font-semibold">
              {name || "User"}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push("/accounts")}
        >
          <Wallet className="mr-2 size-4" />
          Accounts
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push("/sharing")}
        >
          <Users className="mr-2 size-4" />
          Sharing
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push("/fx-rates")}
        >
          <Coins className="mr-2 size-4" />
          FX rates
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Banknote className="mr-2 size-4" />
            Currency
            <span className="ml-auto text-xs text-muted-foreground">
              {getCurrencySymbol(currentCurrency)} {currentCurrency}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={currentCurrency}
              onValueChange={(v) => setDisplayCurrency(v as Currency)}
            >
              {supportedCurrencies.map((currency) => (
                <DropdownMenuRadioItem key={currency} value={currency}>
                  <span className="mr-2 w-6 font-medium">
                    {getCurrencySymbol(currency)}
                  </span>
                  {currencyLabels[currency]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {mounted && theme === "dark" ? (
              <Moon className="mr-2 size-4" />
            ) : mounted && theme === "light" ? (
              <Sun className="mr-2 size-4" />
            ) : (
              <Monitor className="mr-2 size-4" />
            )}
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              {themeOptions.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <option.icon className="mr-2 size-4" />
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => signOutAction()}
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
