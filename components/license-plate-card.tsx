"use client";
import { Share2, ThumbsUp, MessageSquare, Bookmark } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { LicensePlate } from "@/types/license-plate";
import Image from "next/image";
import Link from "next/link";
import { CarLogo } from "./car-logo";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import { Button } from "./ui/button";
import { toast } from "sonner";

export function LicensePlateCard({
  licensePlate,
}: {
  licensePlate: LicensePlate;
}) {
  const handleShare = async () => {
    // Construct the full URL for the license plate
    const plateUrl = `${window.location.origin}/${encodeURIComponent(
      licensePlate.plateNumber
    )}`;

    // Prepare share data
    const shareData = {
      title:
        licensePlate.caption || `License Plate ${licensePlate.plateNumber}`,
      text: `Check out this license plate: ${licensePlate.plateNumber} from ${licensePlate.country}`,
      url: plateUrl,
    };

    // Check if user is on a mobile device
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // If user is on mobile AND Web Share API is available, use native share
    if (isMobile && navigator.share && navigator.canShare(shareData)) {
      try {
        // Use native share sheet
        await navigator.share(shareData);

        // Increment share count (placeholder for future implementation)
      } catch (error) {
        // User probably canceled sharing or another error occurred
        console.log("Sharing was canceled or failed");

        // Fallback to clipboard if sharing fails for some reason
        fallbackToClipboard();
      }
    } else {
      // Desktop or mobile without share support - fallback to clipboard
      fallbackToClipboard();
    }

    // Helper function for clipboard fallback
    function fallbackToClipboard() {
      navigator.clipboard
        .writeText(plateUrl)
        .then(() => {
          // Show success toast
          toast.success("Copied Link", {
            description: `Share ${licensePlate.plateNumber} plate with friends`,
            duration: 3000,
          });
        })
        .catch(() => {
          // Show error toast if clipboard write fails
          toast.error("Failed to copy link", {
            description: "Please try again",
          });
        });
    }
  };

  return (
    <div className="max-w-2xl mx-auto border-t border-gray-200 dark:border-gray-800  dark:hover:bg-gray-900/50 transition-colors">
      {/* Header section */}
      <div className=" pt-4 pb-2">
        {/* Category, time and reporter line */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-md bg-amber-400 flex items-center justify-center text-white">
            <span className="text-lg">{licensePlate.categoryEmoji}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">
              {licensePlate.category || "Cars"}
            </span>
            <div className="flex">
              <span className="text-gray-500 text-xs">
                {licensePlate.reporter}
              </span>
              <span className="text-gray-500 text-xs">
                ‎ · {formatDate(licensePlate.dateAdded)}
              </span>
            </div>
          </div>

          {/* License plate badge on the right */}
          <div className="ml-auto bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-md">
            <span className="font-mono font-bold tracking-wider text-sm">
              {licensePlate.plateNumber}
            </span>
          </div>
        </div>

        {/* Caption with link */}
        <Link href={`/${encodeURIComponent(licensePlate.plateNumber)}`}>
          <h2 className="text-xl font-bold mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
            {licensePlate.caption || licensePlate.plateNumber}
          </h2>
        </Link>
      </div>

      {/* Image carousel */}
      <div className="relative">
        <div className="aspect-video bg-gray-100 dark:bg-gray-800">
          <Carousel
            opts={{
              loop: true,
            }}
          >
            <CarouselContent className="-ml-0">
              {licensePlate.imageUrls.map((imageUrl, index) => (
                <CarouselItem key={index} className="pl-0">
                  <div className="relative aspect-video">
                    <Image
                      src={imageUrl || "/placeholder.svg"}
                      alt={`License plate ${licensePlate.plateNumber} - Image ${
                        index + 1
                      }`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                      priority={index === 0}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>
      </div>

      {/* Tags and engagement section */}
      <div className=" py-3">
        {/* Tags in 9gag style */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(licensePlate.carMake || licensePlate.carModel) && (
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full text-sm">
              <span className="flex items-center gap-1.5">
                <CarLogo make={licensePlate.carMake || ""} size={16} />
                <span>
                  {licensePlate.carMake} {licensePlate.carModel}
                </span>
              </span>
            </div>
          )}

          {/* Regular tags */}
          {licensePlate.tags.map((tag, index) => (
            <div
              key={index}
              className="bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full text-sm"
            >
              {tag}
            </div>
          ))}
        </div>

        {/* Engagement metrics */}
        <div className="flex items-center justify-center gap-4">
          <Button onClick={handleShare}>
            <Share2 className="mr-2" size={16} /> Share
          </Button>
        </div>
      </div>
    </div>
  );
}
