import { db } from "@/db";
import { licensePlates } from "@/db/schema";
import { LicensePlateCard } from "@/components/license-plate-card";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { BackButton } from "@/components/back-button";

interface PageProps {
  params: Promise<{
    plateNumber: string;
  }>;
}

export default async function LicensePlatePage({ params }: PageProps) {
  const resolvedParams = await params;
  // Decode the plate number from URL (spaces and special characters are URL encoded)
  const plateNumber = decodeURIComponent(resolvedParams.plateNumber);

  try {
    // Query the database for the license plate
    const [licensePlate] = await db
      .select()
      .from(licensePlates)
      .where(eq(licensePlates.plateNumber, plateNumber))
      .limit(1);

    // If plate not found, show 404
    if (!licensePlate) {
      notFound();
    }

    return (
      <main className="container mx-auto py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <BackButton />
          {/* Reuse the existing LicensePlateCard component */}
          <LicensePlateCard licensePlate={licensePlate} />
        </div>
      </main>
    );
  } catch (error) {
    console.error("Error fetching license plate:", error);
    notFound();
  }
}
