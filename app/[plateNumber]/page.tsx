import { db } from "@/db";
import { licensePlates } from "@/db/schema";
import { LicensePlateCard } from "@/components/license-plate-card";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{
    plateNumber: string;
  }>;
}

// Generate metadata for the page
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const plateNumber = decodeURIComponent(resolvedParams.plateNumber);

  // Fetch the license plate data
  const [licensePlate] = await db
    .select()
    .from(licensePlates)
    .where(eq(licensePlates.plateNumber, plateNumber))
    .limit(1);

  // If plate not found, return basic metadata
  if (!licensePlate) {
    return {
      title: "License Plate Not Found",
    };
  }

  // Format car make for display
  const formattedCarMake = licensePlate.carMake
    ? licensePlate.carMake
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "Unknown Make";

  // Create marketing-friendly title with emoji
  const title = `🚗 Spotted: A ${formattedCarMake} with plate ${licensePlate.plateNumber} in ${licensePlate.country}`;

  // Create engaging description with call to action
  const description = `This eye-catching ${formattedCarMake} is turning heads with its unique ${licensePlate.plateNumber} plate! Join our community of spotters discovering rare license plates from around the world.`;

  // Get the first image URL or use a fallback
  const imageUrl = licensePlate.imageUrls[0] || "/placeholder.svg";

  // Create the metadata object with optimized title and description
  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${formattedCarMake} with license plate ${licensePlate.plateNumber} from ${licensePlate.country}`,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: description,
      images: [imageUrl],
    },
  };
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
