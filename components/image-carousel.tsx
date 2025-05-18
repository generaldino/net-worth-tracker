"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";

interface ImageCarouselProps {
  imageUrls: string[];
  plateNumber: string;
}

export function ImageCarousel({ imageUrls, plateNumber }: ImageCarouselProps) {
  return (
    <Carousel opts={{ loop: true }}>
      <CarouselContent className="-ml-0">
        {imageUrls.map((imageUrl, index) => (
          <CarouselItem key={index} className="pl-0">
            <div className="relative h-[400px] w-full flex items-center justify-center">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={`License plate ${plateNumber} - Image ${index + 1}`}
                width={800}
                height={600}
                className="object-contain max-h-full max-w-full"
                priority={index === 0}
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {imageUrls.length > 1 && (
        <>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </>
      )}
    </Carousel>
  );
}
