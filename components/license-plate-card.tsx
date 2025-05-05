import { Eye, Share2 } from "lucide-react";
import type { LicensePlate } from "../types/license-plate";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { formatDate } from "../lib/utils";

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
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-video relative bg-muted">
        {licensePlate.imageUrls.length > 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-black/5">
            <div className="bg-background border-4 border-muted p-2 px-4 rounded-md">
              <p className="text-xl font-bold text-center">
                {licensePlate.plateNumber}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">No image available</p>
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-lg">{licensePlate.plateNumber}</h3>
          <div className="text-xs text-muted-foreground">
            {formatDate(licensePlate.dateAdded)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1 mb-2">
          {licensePlate.tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Reported by {licensePlate.reporter}
        </p>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          <span>{licensePlate.views.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Share2 className="h-4 w-4" />
          <span>{licensePlate.shares.toLocaleString()}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
