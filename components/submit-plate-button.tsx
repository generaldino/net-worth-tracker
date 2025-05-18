"use client";

import { Button } from "@/components/ui/button";
import { CameraIcon } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AuthModal } from "@/components/auth/auth-modal";

export function SubmitPlateButton() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleClick = (e: React.MouseEvent) => {
    if (isAuthenticated === false) {
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
