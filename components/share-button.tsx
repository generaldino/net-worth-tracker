"use client";

import { Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface ShareButtonProps {
  plateNumber: string;
  caption?: string | null;
  country?: string;
}

export function ShareButton({
  plateNumber,
  caption,
  country,
}: ShareButtonProps) {
  const handleShare = async () => {
    // Construct the full URL for the license plate
    const plateUrl = `${window.location.origin}/${encodeURIComponent(
      plateNumber
    )}`;

    // Prepare share data
    const shareData = {
      title: caption || `License Plate ${plateNumber}`,
      text: `Check out this license plate: ${plateNumber}${
        country ? ` from ${country}` : ""
      }`,
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
            description: `Share ${plateNumber} plate with friends`,
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
    <Button
      onClick={handleShare}
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground"
    >
      <Share2 className="h-4 w-4 mr-2" />
      Share
    </Button>
  );
}
