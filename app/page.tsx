import { LicensePlateGallery } from "@/components/license-plate-gallery";
import { db } from "@/db";
import { licensePlates, users } from "@/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "WeSpotNumberPlates | Share & Discover Unique License Plates",
  description:
    "Browse the largest collection of unique license plates. Submit your own sightings and join our community of passionate plate spotters!",
  keywords: [
    "license plates",
    "number plates",
    "plate spotting",
    "license plate photos",
    "submit license plates",
    "plate collection",
    "rare plates",
    "plate gallery",
  ],
  creator: "WeSpotNumberPlates",
  publisher: "WeSpotNumberPlates",
  robots: "index, follow",
  alternates: {
    canonical: "https://wespotnumberplates.com",
  },
  openGraph: {
    title: "WeSpotNumberPlates | Share & Discover Unique License Plates",
    description:
      "Browse the largest collection of unique license plates. Submit your own sightings and see them featured in our gallery!",
    url: "https://wespotnumberplates.com",
    siteName: "WeSpotNumberPlates",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "WeSpotNumberPlates - Community gallery of unique license plates",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "📸 Share & Discover Unique License Plates | WeSpotNumberPlates",
    description:
      "See our collection of user-submitted license plates from around the world. Submit your own sightings and join our community of plate spotters!",
    images: ["/og-image.jpg"],
    creator: "@WeSpotPlates",
    site: "@WeSpotPlates",
  },
  metadataBase: new URL("https://wespotnumberplates.com"),
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  category: "License Plate Gallery",
};

// Update the type definition for searchParams to be a Promise
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>; // searchParams is now a Promise
}) {
  // Await searchParams to access its properties
  const resolvedSearchParams = await searchParams;

  // Get page from query params using the resolved searchParams
  const pageString = resolvedSearchParams.page || "1";
  const page = parseInt(pageString, 10);
  const validPage = page > 0 ? page : 1;
  const offset = (validPage - 1) * ITEMS_PER_PAGE;

  // Get plates with pagination
  const [plates, totalCount] = await Promise.all([
    db
      .select({
        id: licensePlates.id,
        plateNumber: licensePlates.plateNumber,
        createdAt: licensePlates.createdAt,
        countryId: licensePlates.countryId,
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
      .orderBy(desc(licensePlates.createdAt))
      .limit(ITEMS_PER_PAGE)
      .offset(offset)
      .then((results) =>
        results.map((plate) => ({
          ...plate,
          reporter: plate.reporter || "Unknown", // Ensure reporter is never null
        }))
      ),

    db
      .select({ count: sql`count(*)` })
      .from(licensePlates)
      .then((result) => Number(result[0]?.count || 0)),
  ]);

  // Create pagination object
  const pagination = {
    total: totalCount,
    page: validPage,
    pageSize: ITEMS_PER_PAGE,
    pageCount: Math.ceil(totalCount / ITEMS_PER_PAGE),
  };

  return (
    <main className="container mx-auto py-10 px-4">
      <LicensePlateGallery
        initialLicensePlates={plates}
        initialPagination={pagination}
        currentPath="/"
      />
    </main>
  );
}
