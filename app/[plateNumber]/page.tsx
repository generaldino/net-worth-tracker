import { db } from "@/db";
import { licensePlates, users, countries } from "@/db/schema";
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
}: {
  params: Promise<{ plateNumber: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const plateNumber = decodeURIComponent(resolvedParams.plateNumber);

  try {
    // Query the database for the license plate
    const [licensePlate] = await db
      .select({
        plateNumber: licensePlates.plateNumber,
        caption: licensePlates.caption,
        country: countries.name,
      })
      .from(licensePlates)
      .leftJoin(countries, eq(licensePlates.countryId, countries.id))
      .where(eq(licensePlates.plateNumber, plateNumber))
      .limit(1);

    if (!licensePlate) {
      return {
        title: "License Plate Not Found",
        description: "The requested license plate could not be found.",
      };
    }

    const countryText = licensePlate.country
      ? ` from ${licensePlate.country}`
      : "";

    return {
      title: `${licensePlate.plateNumber} - ${licensePlate.caption}`,
      description: `View details about license plate ${licensePlate.plateNumber}${countryText}`,
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "License Plate Details",
      description: "View detailed information about this license plate.",
    };
  }
}

export default async function LicensePlatePage({ params }: PageProps) {
  const resolvedParams = await params;
  // Decode the plate number from URL (spaces and special characters are URL encoded)
  const plateNumber = decodeURIComponent(resolvedParams.plateNumber);

  try {
    // Query the database for the license plate
    const [licensePlate] = await db
      .select({
        id: licensePlates.id,
        plateNumber: licensePlates.plateNumber,
        createdAt: licensePlates.createdAt,
        countryId: licensePlates.countryId,
        country: countries.name, // Join with countries table
        caption: licensePlates.caption,
        imageUrls: licensePlates.imageUrls,
        tags: licensePlates.tags,
        userId: licensePlates.userId,
        carMake: licensePlates.carMake,
        categoryId: licensePlates.categoryId,
        reporter: users.name,
      })
      .from(licensePlates)
      .leftJoin(users, eq(licensePlates.userId, users.id))
      .leftJoin(countries, eq(licensePlates.countryId, countries.id)) // Left join to get country data
      .where(eq(licensePlates.plateNumber, plateNumber))
      .limit(1)
      .then((results) =>
        results.map((plate) => ({
          ...plate,
          reporter: plate.reporter || "Unknown",
        }))
      );

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
