"use client";

import { Button } from "@/components/ui/button";
import { CameraIcon } from "lucide-react";

export function SubmitPlateButton() {
  return (
    <Button>
      <CameraIcon className="mr-2 h-4 w-4" />
      <span>Submit Plate</span>
    </Button>
  );
}
