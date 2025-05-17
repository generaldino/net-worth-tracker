import { notFound } from "next/navigation";
import { db } from "@/db";
import { LicensePlate, licensePlates } from "@/db/schema";
import { eq, arrayContains, desc, sql } from "drizzle-orm";
import { LicensePlateGallery } from "@/components/license-plate-gallery";
import { ITEMS_PER_PAGE } from "@/lib/constants";

// Define the props type, correctly typing both params and searchParams as Promises
interface FilterPageProps {
  params: Promise<{
    type: string;
    value: string;
  }>;
  searchParams: Promise<{ page?: string }>; // searchParams is now a Promise
}

export default async function FilterPage({
  params,
  searchParams,
}: FilterPageProps) {
  // Await both params and searchParams
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { type, value } = resolvedParams; // Destructure from awaited params
  const decodedValue = decodeURIComponent(value);

  // Get page from query params from awaited searchParams
  const page = parseInt(resolvedSearchParams.page || "1", 10);
  const validPage = page > 0 ? page : 1;
  const offset = (validPage - 1) * ITEMS_PER_PAGE;

  // Set up title and description based on filter type
  let title = "";
  let description = "";
  let plates: LicensePlate[] = [];
  let totalCount = 0;

  try {
    // Apply the appropriate filter based on the type
    switch (type) {
      case "reporter":
        title = `Posts by ${decodedValue}`;
        description = `License plates reported by ${decodedValue}`;

        [plates, totalCount] = await Promise.all([
          db
            .select()
            .from(licensePlates)
            .where(eq(licensePlates.reporter, decodedValue))
            .orderBy(desc(licensePlates.createdAt))
            .limit(ITEMS_PER_PAGE)
            .offset(offset),

          db
            .select({ count: sql`count(*)` })
            .from(licensePlates)
            .where(eq(licensePlates.reporter, decodedValue))
            .then((result) => Number(result[0]?.count || 0)),
        ]);

        break;

      case "tag":
        title = `#${decodedValue}`;
        description = `License plates tagged with #${decodedValue}`;

        // This case is more complex as we're combining multiple queries
        // For simplicity, we'll implement basic pagination for tags

        // Query for car make
        const [carMakePlates, carMakeCount] = await Promise.all([
          db
            .select()
            .from(licensePlates)
            .where(eq(licensePlates.carMake, decodedValue))
            .orderBy(desc(licensePlates.createdAt))
            .limit(ITEMS_PER_PAGE)
            .offset(offset),

          db
            .select({ count: sql`count(*)` })
            .from(licensePlates)
            .where(eq(licensePlates.carMake, decodedValue))
            .then((result) => Number(result[0]?.count || 0)),
        ]);

        // If we found results as car make, use those
        if (carMakeCount > 0) {
          plates = carMakePlates;
          totalCount = carMakeCount;
          title = decodedValue;
          description = `License plates with ${decodedValue} vehicles`;
          break;
        }

        // Query for country
        const [countryPlates, countryCount] = await Promise.all([
          db
            .select()
            .from(licensePlates)
            .where(eq(licensePlates.country, decodedValue))
            .orderBy(desc(licensePlates.createdAt))
            .limit(ITEMS_PER_PAGE)
            .offset(offset),

          db
            .select({ count: sql`count(*)` })
            .from(licensePlates)
            .where(eq(licensePlates.country, decodedValue))
            .then((result) => Number(result[0]?.count || 0)),
        ]);

        // If we found results as country, use those
        if (countryCount > 0) {
          plates = countryPlates;
          totalCount = countryCount;
          title = decodedValue;
          description = `License plates from ${decodedValue}`;
          break;
        }

        // Finally, check regular tags
        const [tagPlates, tagCount] = await Promise.all([
          db
            .select()
            .from(licensePlates)
            .where(arrayContains(licensePlates.tags, [decodedValue]))
            .orderBy(desc(licensePlates.createdAt))
            .limit(ITEMS_PER_PAGE)
            .offset(offset),

          db
            .select({ count: sql`count(*)` })
            .from(licensePlates)
            .where(arrayContains(licensePlates.tags, [decodedValue]))
            .then((result) => Number(result[0]?.count || 0)),
        ]);

        plates = tagPlates;
        totalCount = tagCount;
        break;

      case "category":
        title = decodedValue;
        description = `License plates in the ${decodedValue} category`;

        [plates, totalCount] = await Promise.all([
          db
            .select()
            .from(licensePlates)
            .where(eq(licensePlates.category, decodedValue))
            .orderBy(desc(licensePlates.createdAt))
            .limit(ITEMS_PER_PAGE)
            .offset(offset),

          db
            .select({ count: sql`count(*)` })
            .from(licensePlates)
            .where(eq(licensePlates.category, decodedValue))
            .then((result) => Number(result[0]?.count || 0)),
        ]);

        break;

      default:
        return notFound();
    }
  } catch (error) {
    console.error("Error fetching filtered license plates:", error);
    plates = [];
    totalCount = 0;
  }

  const pagination = {
    total: totalCount,
    page: validPage,
    pageSize: ITEMS_PER_PAGE,
    pageCount: Math.ceil(totalCount / ITEMS_PER_PAGE),
  };

  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2 text-center">{title}</h1>
      <p className="text-muted-foreground mb-8 text-center">{description}</p>

      <LicensePlateGallery
        initialLicensePlates={plates}
        initialPagination={pagination}
        filterParams={{ type, value: decodedValue }}
      />
    </main>
  );
}
