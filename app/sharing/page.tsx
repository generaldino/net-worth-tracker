import { ShareDashboardSection } from "@/components/sharing/ShareDashboardSection";

export default function SharingPage() {
  return (
    <div className="min-h-[calc(100svh-56px)] bg-background">
      <div className="w-full py-4 px-4 sm:px-6 max-w-6xl mx-auto">
        <ShareDashboardSection />
      </div>
    </div>
  );
}

