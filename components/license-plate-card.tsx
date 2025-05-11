"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Share2, ThumbsUp } from "lucide-react";
import { formatDate } from "@/lib/utils";
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
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer max-w-2xl mx-auto"
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="font-bold text-lg">
                {licensePlate.caption || licensePlate.plateNumber}
              </h3>
              <div className="flex">
                <p className="text-xs text-muted-foreground">
                  Posted by {licensePlate.reporter} {"  · "}
                </p>
                <span className="text-xs text-muted-foreground">
                  {" ‎   "}
                  {formatDate(licensePlate.dateAdded)}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-muted px-3 py-1.5 rounded-md border-1">
            <span className="font-mono font-bold tracking-wider">
              {licensePlate.plateNumber}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative">
          <div className="aspect-video bg-muted">
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
                        src={imageUrl}
                        alt={`License plate ${
                          licensePlate.plateNumber
                        } - Image ${index + 1}`}
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
      </CardContent>

      <CardFooter className="flex flex-col items-start pt-4 pb-4">
        <div className="flex flex-wrap gap-1 mb-3 w-full">
          {(licensePlate.carMake || licensePlate.carModel) && (
            <Badge
              variant="secondary"
              className="text-xs flex items-center gap-1.5"
            >
              <CarLogo make={licensePlate.carMake || ""} size={16} />
              <span>
                {licensePlate.carMake} {licensePlate.carModel}
              </span>
            </Badge>
          )}

          {/* Regular tags */}
          {licensePlate.tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex justify-between w-full border-t pt-3 mt-1">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                {Math.floor(licensePlate.views / 10)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                {licensePlate.views.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Share2 className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">
              {licensePlate.shares.toLocaleString()}
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
