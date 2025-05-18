"use client";

import { Button } from "@/components/ui/button";
import { CameraIcon } from "lucide-react";
import Link from "next/link";

export function SubmitPlateButton() {
  return (
    <Button asChild>
      <Link href="/submit-plate">
        <CameraIcon className="mr-2 h-4 w-4" />
        <span>Submit Plate</span>
      </Link>
    </Button>
  );
}
