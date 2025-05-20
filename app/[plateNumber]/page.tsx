import { db } from "@/db";
import { licensePlates, users, countries, carMakes } from "@/db/schema";
import { LicensePlateCard } from "@/components/license-plate-card";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Metadata } from "next";
import type { LicensePlate } from "@/types/license-plate";

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
        carMake: carMakes.name,
      })
      .from(licensePlates)
      .leftJoin(countries, eq(licensePlates.countryId, countries.id))
      .leftJoin(carMakes, eq(licensePlates.carMakeId, carMakes.id))
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

    const carMakeText = licensePlate.carMake
      ? ` (${licensePlate.carMake})`
      : "";

    return {
      title: `${licensePlate.plateNumber} - ${licensePlate.caption}`,
      description: `View details about license plate ${licensePlate.plateNumber}${countryText}${carMakeText}`,
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
    const [result] = await db
      .select({
        id: licensePlates.id,
        plateNumber: licensePlates.plateNumber,
        createdAt: licensePlates.createdAt,
        countryId: licensePlates.countryId,
        country: countries.name,
        caption: licensePlates.caption,
        userId: licensePlates.userId,
        carMakeId: licensePlates.carMakeId,
        carMake: carMakes.name,
        categoryId: licensePlates.categoryId,
        reporter: users.name,
      })
      .from(licensePlates)
      .leftJoin(users, eq(licensePlates.userId, users.id))
      .leftJoin(countries, eq(licensePlates.countryId, countries.id))
      .leftJoin(carMakes, eq(licensePlates.carMakeId, carMakes.id))
      .where(eq(licensePlates.plateNumber, plateNumber))
      .limit(1);

    // If plate not found, show 404
    if (!result) {
      notFound();
    }

    // Prepare license plate object matching the LicensePlate type
    const licensePlate: LicensePlate = {
      id: result.id,
      plateNumber: result.plateNumber,
      createdAt: result.createdAt,
      countryId: result.countryId,
      caption: result.caption,
      userId: result.userId,
      carMakeId: result.carMakeId,
      categoryId: result.categoryId,
      reporter: result.reporter || "Unknown",
      carMake: result.carMake || undefined, // Replace null with undefined
    };

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
