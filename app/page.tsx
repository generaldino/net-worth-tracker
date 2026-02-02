import { LandingPage } from "@/components/auth/landing-page";
import { DashboardShell } from "@/components/dashboard-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  // Show landing page for unauthenticated users
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

  // Show dashboard for authenticated users
  // The DashboardShell component handles all the providers and parallel loading
  return <DashboardShell session={session} />;
}
