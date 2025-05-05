import { Eye, Share2, Calendar, User } from "lucide-react";
import type { LicensePlate } from "../types/license-plate";
import { Badge } from "./ui/badge";
import { formatDate } from "../lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

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
          <div className="bg-background border-4 border-muted p-4 rounded-md flex items-center justify-center">
            <p className="text-3xl font-bold text-center">
              {licensePlate.plateNumber}
            </p>
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
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Image URLs:</h3>
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
