"use client";

import { Button } from "@/components/ui/button";
import { CameraIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AuthModal } from "@/components/auth/auth-modal";

interface SubmitPlateButtonProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export function SubmitPlateButton({
  isAuthenticated,
  isAdmin,
}: SubmitPlateButtonProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Don't render the button if user is authenticated but not an admin
  if (isAuthenticated && !isAdmin) {
    return null;
  }

  const handleClick = async (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  const closeModal = () => {
    setShowAuthModal(false);
  };

  const onSuccessfulAuth = () => {
    setShowAuthModal(false);
    router.push("/submit-plate");
  };

  return (
    <>
      <Button asChild>
        <Link href="/submit-plate" onClick={handleClick}>
          <CameraIcon className="mr-2 h-4 w-4" />
          <span>Submit Plate</span>
        </Link>
      </Button>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={closeModal}
          onSuccess={onSuccessfulAuth}
        />
      )}
    </>
  );
}
