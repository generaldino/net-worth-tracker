"use client";
import { Share2, ThumbsUp, MessageSquare, Bookmark } from "lucide-react";
import { formatDate, getCategoryEmoji } from "@/lib/utils";
import type { LicensePlate } from "@/types/license-plate";
import Image from "next/image";
import { CarLogo } from "./car-logo";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";

interface LicensePlateCardProps {
  licensePlate: LicensePlate;
  onClick: () => void;
}

export function LicensePlateCard({
  licensePlate,
  onClick,
}: LicensePlateCardProps) {
  // Determine category based on first tag or default to "Cars"
  const category = licensePlate.tags[0] || "Cars";
  const categoryEmoji = getCategoryEmoji(category);

  return (
    <div
      className="max-w-2xl mx-auto border-t border-gray-200 dark:border-gray-800  dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Header section */}
      <div className="px-4 pt-4 pb-2">
        {/* Category, time and reporter line */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-md bg-amber-400 flex items-center justify-center text-white">
            <span className="text-lg">{categoryEmoji}</span>
          </div>
          <span className="font-bold">{category}</span>
          <span className="text-gray-500 text-sm">
            {formatDate(licensePlate.dateAdded)}
          </span>
          <span className="text-gray-500 text-sm">·</span>
          <span className="text-gray-500 text-sm">
            Posted by {licensePlate.reporter}
          </span>

          {/* License plate badge on the right */}
          <div className="ml-auto bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-md">
            <span className="font-mono font-bold tracking-wider text-sm">
              {licensePlate.plateNumber}
            </span>
          </div>
        </div>

        {/* Caption */}
        <h2 className="text-xl font-bold mb-2">
          {licensePlate.caption || licensePlate.plateNumber}
        </h2>
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
      <div className="px-4 py-3">
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
        <div className="flex items-center justify-between text-gray-500">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-5 w-5" />
              <span className="text-sm">
                {Math.floor(licensePlate.views / 10)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm">
                {Math.floor(licensePlate.shares / 3)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Bookmark className="h-5 w-5" />
            <Share2 className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
