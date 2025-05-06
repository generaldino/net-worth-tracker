"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, Share2, Calendar, User, ThumbsUp } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { LicensePlate } from "@/types/license-plate";

interface LicensePlateDialogProps {
  licensePlate: LicensePlate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LicensePlateDialog({
  licensePlate,
  open,
  onOpenChange,
}: LicensePlateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {licensePlate.plateNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Main image */}
          <div className="relative bg-muted aspect-video flex items-center justify-center">
            {licensePlate.imageUrls.length > 0 ? (
              <div className="w-full h-full flex items-center justify-center bg-black/10">
                <div className="text-center text-muted-foreground">
                  <p>Image: {licensePlate.imageUrls[0]}</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">No image available</p>
              </div>
            )}

            {/* License plate overlay at bottom */}
            <div className="absolute bottom-4 left-0 w-full flex justify-center">
              <div className="bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 border-zinc-700 rounded-md p-3 px-8 shadow-lg">
                <div className="absolute top-0 left-0 w-full flex justify-center">
                  <div className="bg-blue-600 text-white text-xs px-4 py-0.5 rounded-b-md">
                    {licensePlate.tags[0] || "USA"}
                  </div>
                </div>
                <div className="flex justify-center items-center pt-2">
                  <p className="text-2xl font-bold text-center text-white tracking-wider">
                    {licensePlate.plateNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {licensePlate.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Added: {formatDate(licensePlate.dateAdded)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">By: {licensePlate.reporter}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {licensePlate.views.toLocaleString()} views
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {licensePlate.shares.toLocaleString()} shares
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {Math.floor(licensePlate.views / 10)} likes
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">All Images:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {licensePlate.imageUrls.map((url, index) => (
                <li key={index} className="truncate">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
