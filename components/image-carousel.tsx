"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { ImageModal } from "./image-modal";

interface ImageCarouselProps {
  imageUrls: string[];
  plateNumber: string;
}

export function ImageCarousel({ imageUrls, plateNumber }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  const handleImageClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="relative h-full">
        {/* Main image */}
        <div
          className="relative h-full cursor-pointer"
          onClick={handleImageClick}
        >
          <Image
            src={imageUrls[currentIndex]}
            alt={`License plate ${plateNumber}`}
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Navigation buttons */}
        {imageUrls.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Image counter */}
        {imageUrls.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {imageUrls.length}
          </div>
        )}
      </div>

      {/* Full screen modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={imageUrls[currentIndex]}
        plateNumber={plateNumber}
      />
    </>
  );
}
