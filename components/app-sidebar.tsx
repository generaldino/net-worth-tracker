"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { useDemo } from "@/contexts/demo-context";
import {
  Home,
  Users,
  BookOpen,
  LogOut,
  Monitor,
  Sun,
  Moon,
  ChevronUp,
  FlaskConical,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface AppSidebarProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Share Dashboard",
    url: "/sharing",
    icon: Users,
  },
  {
    title: "Documentation",
    url: "/documentation",
    icon: BookOpen,
  },
];

function DemoToggle() {
  const { isDemoMode, toggleDemoMode } = useDemo();
  const { state } = useSidebar();

  return (
    <SidebarMenuButton
      onClick={toggleDemoMode}
      tooltip={state === "collapsed" ? "Demo Mode" : undefined}
      className={`w-full ${isDemoMode ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" : ""}`}
    >
      <FlaskConical className="size-4" />
      <span>Demo Mode</span>
      <div
        className={`ml-auto h-4 w-7 rounded-full transition-colors ${
          isDemoMode ? "bg-emerald-500" : "bg-muted-foreground/30"
        }`}
      >
        <div
          className={`h-3 w-3 mt-0.5 rounded-full bg-white transition-transform ${
            isDemoMode ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </div>
    </SidebarMenuButton>
  );
}

function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { state } = useSidebar();

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeOptions = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  const currentTheme =
    themeOptions.find((t) => t.value === theme) || themeOptions[2];
  const CurrentIcon = currentTheme.icon;

  if (!mounted) {
    return (
      <SidebarMenuButton className="w-full">
        <Monitor className="size-4" />
        <span>Theme</span>
      </SidebarMenuButton>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          tooltip={state === "collapsed" ? "Theme" : undefined}
        >
          <CurrentIcon className="size-4" />
          <span>Theme</span>
          <ChevronUp className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-[--radix-dropdown-menu-trigger-width] min-w-48"
      >
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {themeOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <option.icon className="mr-2 size-4" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({
  name,
  email,
  avatarUrl,
}: {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [imageError, setImageError] = useState(false);
  const { state } = useSidebar();

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
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          tooltip={state === "collapsed" ? name || "User" : undefined}
        >
          <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg border border-sidebar-border bg-sidebar-accent">
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
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{name || "User"}</span>
            <span className="truncate text-xs text-muted-foreground">
              {email}
            </span>
          </div>
          <ChevronUp className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side="top"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg border bg-accent">
            {avatarUrl && !imageError ? (
              <Image
                src={avatarUrl}
                alt={name || "User"}
                width={32}
                height={32}
                className="size-full object-cover"
                priority
              />
            ) : (
              <span className="text-xs font-medium">{initials}</span>
            )}
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{name || "User"}</span>
            <span className="truncate text-xs text-muted-foreground">
              {email}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar({ name, email, avatarUrl }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      {/* Header with logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => router.push("/")}
              className="cursor-pointer"
              tooltip={state === "collapsed" ? "Wealth Tracker" : undefined}
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                <span className="text-lg">💰</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Wealth Tracker</span>
                <span className="truncate text-xs text-muted-foreground">
                  Track your finances
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => router.push(item.url)}
                    isActive={pathname === item.url}
                    tooltip={state === "collapsed" ? item.title : undefined}
                    className="cursor-pointer"
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with demo toggle, theme selector and user */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DemoToggle />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <ThemeSelector />
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
