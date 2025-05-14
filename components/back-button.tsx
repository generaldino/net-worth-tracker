"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function BackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      onClick={() => router.back()}
      // className="p-0 hover:bg-transparent"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}
