"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  plateNumber: string;
}

export function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  plateNumber,
}: ImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-transparent border-none">
        <VisuallyHidden asChild>
          <DialogTitle>
            License plate {plateNumber} - Full size image
          </DialogTitle>
        </VisuallyHidden>
        <div className="relative w-full h-full">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
            aria-label="Close image modal"
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="relative w-full h-[90vh]">
            <Image
              src={imageUrl}
              alt={`License plate ${plateNumber}`}
              fill
              className="object-contain"
              priority
              quality={100}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
