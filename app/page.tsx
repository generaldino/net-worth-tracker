import { LandingPage } from "@/components/auth/landing-page";
import { DashboardShell } from "@/components/dashboard-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <LandingPage />
        <Toaster />
      </ThemeProvider>
    );
  }

  return <DashboardShell session={session} />;
}
