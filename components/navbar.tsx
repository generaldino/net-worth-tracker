"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { CheckCircle2, ClipboardPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaskToggleButton } from "@/components/mask-toggle-button";
import { AssistantTriggerButton } from "@/components/assistant/assistant-trigger-button";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import type { CheckinStatus } from "@/app/actions/checkin";

interface NavbarProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  checkin: CheckinStatus | null;
}

const tabs = [
  { title: "Net Worth", href: "/" },
  { title: "Budget", href: "/budget" },
];

/**
 * The app's only navigation: two tabs (the two jobs), the check-in button
 * (the ritual), and an avatar menu for everything else.
 */
export function Navbar({ name, email, avatarUrl, checkin }: NavbarProps) {
  const pathname = usePathname();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");
  const iconSrc = isDark ? "/icon-dark.svg" : "/icon-light.svg";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 w-full items-center gap-1 px-3 sm:gap-2 sm:px-6">
        <Link
          href="/"
          className="mr-1 flex shrink-0 items-center gap-2 sm:mr-3"
          aria-label="Wealth Tracker home"
        >
          <Image
            src={iconSrc}
            alt=""
            width={28}
            height={28}
            className="size-7 object-contain"
            priority
          />
          <span className="hidden font-semibold md:inline">Wealth Tracker</span>
        </Link>

        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive(tab.href)
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {tab.title}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {checkin &&
            (checkin.done ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground"
              >
                <Link href="/checkin" title={`${checkin.monthLabel} is done — open the check-in`}>
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">{checkin.monthLabel}</span>
                  <span className="sm:hidden">✓</span>
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="h-8 gap-1.5">
                <Link href="/checkin">
                  <ClipboardPen className="size-3.5" />
                  <span className="hidden sm:inline">
                    Check in · {checkin.monthLabel}
                  </span>
                  <span className="sm:hidden">Check in</span>
                </Link>
              </Button>
            ))}
          <MaskToggleButton />
          <AssistantTriggerButton />
          <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
        </div>
      </div>
    </nav>
  );
}
