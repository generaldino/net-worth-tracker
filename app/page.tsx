import { LicensePlateGallery } from "@/components/license-plate-gallery";
import { licensePlates } from "@/data/license-plates";

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2">License Plate Gallery</h1>
      <p className="text-muted-foreground mb-8">
        Browse our collection of unique license plates from across the country
      </p>
      <LicensePlateGallery licensePlates={licensePlates} />
    </main>
  );
}
