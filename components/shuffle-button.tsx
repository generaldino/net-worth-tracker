"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getRandomLicensePlate } from "@/app/actions";
import { toast } from "sonner";

export function ShuffleButton() {
  const router = useRouter();

  const handleShuffle = async () => {
    try {
      const result = await getRandomLicensePlate();

      if (result.success && result.plateNumber) {
        // Navigate to the license plate page
        router.push(`/${encodeURIComponent(result.plateNumber)}`);
      } else {
        toast.error("Couldn't find a random plate", {
          description: "Please try again later",
        });
      }
    } catch (error) {
      toast.error("Something went wrong", {
        description: "Please try again later",
      });
      console.error("Error in shuffle:", error);
    } finally {
    }
  };

  return (
    <Button onClick={handleShuffle} variant="outline">
      <span>🔀 Shuffle</span>
    </Button>
  );
}
