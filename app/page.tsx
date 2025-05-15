import { LicensePlateGallery } from "@/components/license-plate-gallery";
import { db } from "@/db";
import { licensePlates } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "License Plate Gallery",
  description:
    "Browse our collection of unique license plates from across the country",
  openGraph: {
    title: "Spotted! Rare & Unique License Plates from Around the World 🔍",
    description:
      "Join thousands of enthusiasts exploring extraordinary license plates from vintage classics to modern exotics. Discover, share, and connect with the world's largest plate-spotting community!",
    images: [
      {
        // You can use a representative image from your collection or a branded image
        url: "/og-image.jpg", // Replace with your actual OG image path
        width: 1200,
        height: 630,
        alt: "License Plate Gallery - Collection of unique and rare license plates",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spotted! Rare & Unique License Plates from Around the World 🔍",
    description:
      "Join thousands of enthusiasts exploring extraordinary license plates from vintage classics to modern exotics. Discover, share, and connect with the world's largest plate-spotting community!",
    images: ["/og-image.jpg"], // Replace with your actual OG image path
  },
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
      .select()
      .from(licensePlates)
      .orderBy(desc(licensePlates.createdAt))
      .limit(ITEMS_PER_PAGE)
      .offset(offset),

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
      <h1 className="text-3xl font-bold mb-2 text-center">
        License Plate Gallery
      </h1>
      <p className="text-muted-foreground mb-8 text-center">
        Browse our collection of unique license plates from across the country
      </p>
      <LicensePlateGallery
        initialLicensePlates={plates}
        initialPagination={pagination}
      />
    </main>
  );
}
