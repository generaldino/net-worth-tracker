import { LicensePlateGallery } from "@/components/license-plate-gallery";
import { db } from "@/db";
import { licensePlates } from "@/db/schema";

export default async function Home() {
  const plates = await db.select().from(licensePlates);

  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2">License Plate Gallery</h1>
      <p className="text-muted-foreground mb-8">
        Browse our collection of unique license plates from across the country
      </p>
      <LicensePlateGallery licensePlates={plates} />
    </main>
  );
}
