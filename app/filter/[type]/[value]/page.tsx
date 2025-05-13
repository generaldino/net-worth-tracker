import { notFound } from "next/navigation";
import { db } from "@/db";
import { LicensePlate, licensePlates } from "@/db/schema";
import { eq, arrayContains } from "drizzle-orm";
import { LicensePlateGallery } from "@/components/license-plate-gallery";

interface FilterPageProps {
  params: Promise<{
    type: string;
    value: string;
  }>;
}

export default async function FilterPage({ params }: FilterPageProps) {
  const { type, value } = await params;
  const decodedValue = decodeURIComponent(value);

  // Set up title and description based on filter type
  let title = "";
  let description = "";
  let plates: LicensePlate[] = [];

  try {
    // Apply the appropriate filter based on the type
    switch (type) {
      case "reporter":
        title = `Posts by ${decodedValue}`;
        description = `License plates reported by ${decodedValue}`;
        plates = await db
          .select()
          .from(licensePlates)
          .where(eq(licensePlates.reporter, decodedValue));
        break;

      case "tag":
        title = `#${decodedValue}`;
        description = `License plates tagged with #${decodedValue}`;
        plates = await db
          .select()
          .from(licensePlates)
          .where(arrayContains(licensePlates.tags, [decodedValue]));
        break;

      case "category":
        title = decodedValue;
        description = `License plates in the ${decodedValue} category`;
        plates = await db
          .select()
          .from(licensePlates)
          .where(eq(licensePlates.category, decodedValue));
        break;

      default:
        return notFound();
    }
  } catch (error) {
    console.error("Error fetching filtered license plates:", error);
    plates = [];
  }

  // If no results found, we could either show an empty gallery or a not found page
  // Here I'm choosing to show an empty gallery with the filter info

  return (
    <main className="container mx-auto py-10 px-4">
      <div className="max-w-2xl mx-auto mb-8">
        {/* Back button */}
        <div className="mb-4">
          <a href="/" className="text-blue-600 hover:underline">
            ← Back to Gallery
          </a>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center">{title}</h1>
      <p className="text-muted-foreground mb-8 text-center">{description}</p>

      <LicensePlateGallery licensePlates={plates} />
    </main>
  );
}
