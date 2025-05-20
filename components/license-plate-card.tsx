import { formatCarMake, formatDate } from "@/lib/utils";
import type { LicensePlate } from "@/types/license-plate";
import Link from "next/link";
import { CarLogo } from "./car-logo";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { HighlightText } from "./highlight-text";
import { ReportButton } from "./report-button";
import { colorVariantsBackground } from "@/lib/color-variants";
import { getCategoryById } from "@/lib/actions/categories";
import { getCountryById } from "@/lib/actions/countries";
import { getCarMakeById } from "@/lib/actions/car-makes";
import { getImagesByLicensePlateId } from "@/lib/actions/images";

import type { Category, Country, CarMake } from "@/db/schema";
import { ShareButton } from "@/components/share-button";
import { ImageCarousel } from "@/components/image-carousel";
import { getTagsByLicensePlateId } from "@/lib/actions/tags";

interface LicensePlateCardProps {
  licensePlate: LicensePlate;
  searchTerm?: string;
}

export async function LicensePlateCard({
  licensePlate,
  searchTerm = "",
}: LicensePlateCardProps) {
  // Fetch category on the server instead of using useEffect
  let category: Category | null = null;
  if (licensePlate.categoryId) {
    category = await getCategoryById(licensePlate.categoryId);
  }

  // Fetch country on the server
  let country: Country | null = null;
  let countryName = "Unknown";
  let countryFlag = "🏳️";

  if (licensePlate.countryId) {
    country = await getCountryById(licensePlate.countryId);
    if (country) {
      countryName = country.name;
      countryFlag = country.flag;
    }
  }

  // Fetch car make on the server
  let carMake: CarMake | null = null;
  let carMakeName = licensePlate.carMake || "Unknown";
  let carMakeLogoUrl = "/car-logos/default.svg";

  if (licensePlate.carMakeId) {
    carMake = await getCarMakeById(licensePlate.carMakeId);
    if (carMake) {
      carMakeName = carMake.name;
      carMakeLogoUrl = carMake.logoUrl;
    }
  }

  // Fetch tags for this license plate
  const tags = await getTagsByLicensePlateId(licensePlate.id);

  // Fetch images for this license plate
  const images = await getImagesByLicensePlateId(licensePlate.id);
  const imageUrls = images.map((image) => image.url);

  return (
    <div className="max-w-2xl mx-auto border-b pb-4 border-gray-200 dark:border-gray-800 dark:hover:bg-gray-900/50 transition-colors">
      {/* Header section */}
      <div className=" pb-2">
        {/* Category, time and reporter line */}
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className={`w-8 h-8 rounded-md ${
              colorVariantsBackground[
                category?.color as keyof typeof colorVariantsBackground
              ] || "bg-amber-300"
            } flex items-center justify-center`}
          >
            <span className="text-lg">{category?.emoji}</span>
          </div>
          <div className="flex flex-col">
            <Link
              href={`/filter/category/${encodeURIComponent(
                category?.name || "Cars"
              )}`}
              className="font-bold text-sm hover:text-blue-600 hover:underline"
            >
              <HighlightText
                text={category?.name || "Cars"}
                searchTerm={searchTerm}
              />
            </Link>
            <div className="flex">
              <Link
                href={`/filter/reporter/${encodeURIComponent(
                  licensePlate.reporter
                )}`}
                className="text-gray-500 text-xs hover:text-blue-600 hover:underline"
              >
                <HighlightText
                  text={licensePlate.reporter}
                  searchTerm={searchTerm}
                />
              </Link>
              <span className="text-gray-500 text-xs">
                ‎ · {formatDate(licensePlate.createdAt)}
              </span>
            </div>
          </div>

          {/* License plate badge on the right */}
          <div className="ml-auto bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-md">
            <span className="font-mono font-bold tracking-wider text-sm">
              <HighlightText
                text={licensePlate.plateNumber}
                searchTerm={searchTerm}
              />
            </span>
          </div>
        </div>

        {/* Caption with link */}
        <Link href={`/${encodeURIComponent(licensePlate.plateNumber)}`}>
          <h2 className="text-xl font-bold mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
            <HighlightText
              text={licensePlate.caption || licensePlate.plateNumber}
              searchTerm={searchTerm}
            />
          </h2>
        </Link>
      </div>

      {/* Image carousel */}
      <div className="relative">
        <div className="h-[400px] bg-gray-50 dark:bg-gray-950">
          <ImageCarousel
            imageUrls={imageUrls}
            plateNumber={licensePlate.plateNumber}
          />
        </div>
      </div>

      {/* Tags and engagement section */}
      <ScrollArea className="whitespace-nowrap">
        <div className="py-3">
          {/* Tags in 9gag style */}

          <div className="flex gap-2">
            <Link
              href={`/filter/tag/${encodeURIComponent(countryName)}`}
              className="bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-[13px]">{countryFlag}</span>
                <HighlightText text={countryName} searchTerm={searchTerm} />
              </span>
            </Link>

            {carMakeName && (
              <Link
                href={`/filter/tag/${encodeURIComponent(carMakeName)}`}
                className="flex bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <CarLogo make={carMakeName} logoUrl={carMakeLogoUrl} />
                  <HighlightText
                    text={formatCarMake(carMakeName)}
                    searchTerm={searchTerm}
                  />
                </span>
              </Link>
            )}

            {tags.map((tag: { id: string; name: string }) => (
              <Link
                key={tag.id}
                href={`/filter/tag/${encodeURIComponent(tag.name)}`}
                className="bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <HighlightText text={tag.name} searchTerm={searchTerm} />
              </Link>
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {/* Engagement metrics */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center space-x-2">
          <ShareButton
            plateNumber={licensePlate.plateNumber}
            caption={licensePlate.caption}
            country={countryName}
          />
          <ReportButton
            licensePlateId={licensePlate.id}
            plateNumber={licensePlate.plateNumber}
          />
        </div>
      </div>
    </div>
  );
}
