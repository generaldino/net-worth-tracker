import { licensePlates } from "@/data/license-plates";
import { LicensePlateCard } from "@/components/license-plate-card";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    plateNumber: string;
  }>;
}

export default async function LicensePlatePage({ params }: PageProps) {
  const { plateNumber: encodedPlateNumber } = await params;

  // Decode the plate number from URL (spaces and special characters are URL encoded)
  const plateNumber = decodeURIComponent(encodedPlateNumber);

  // Find the license plate in our mock data
  const licensePlate = licensePlates.find(
    (plate) => plate.plateNumber === plateNumber
  );

  // If plate not found, show 404
  if (!licensePlate) {
    notFound();
  }

  return (
    <main className="container mx-auto py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <div className="mb-4">
          <a href="/" className="text-blue-600 hover:underline">
            ← Back to Gallery
          </a>
        </div>

        {/* Reuse the existing LicensePlateCard component */}
        <LicensePlateCard licensePlate={licensePlate} />
      </div>
    </main>
  );
}
