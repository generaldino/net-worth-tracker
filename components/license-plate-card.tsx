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
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer max-w-2xl mx-auto"
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              {licensePlate.reporterProfilePicture ? (
                <Image
                  src={licensePlate.reporterProfilePicture}
                  alt={`${licensePlate.reporter}'s profile`}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full rounded-4xl "
                />
              ) : (
                <span className="font-semibold text-xs">
                  {licensePlate.reporter.charAt(0)}
                </span>
              )}
            </div>
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
          {/* Car make/model info overlay - your provided UI component */}
          {(licensePlate.carMake || licensePlate.carModel) && (
            <div className="absolute top-3 right-3 z-10">
              <div className="bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
                <CarLogo make={licensePlate.carMake || ""} size={20} />
                <span className="text-xs font-medium">
                  {licensePlate.carMake} {licensePlate.carModel}
                </span>
              </div>
            </div>
          )}
          {/* Main image */}
          <div className="bg-muted aspect-video flex items-center justify-center">
            {licensePlate.imageUrls.length > 0 ? (
              <div className="w-full h-full relative">
                <Image
                  src={licensePlate.imageUrls[0]}
                  alt={`License plate ${licensePlate.plateNumber}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority={false}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">No image available</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start pt-4 pb-4">
        <div className="flex flex-wrap gap-1 mb-3 w-full">
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
