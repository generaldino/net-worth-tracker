"use client";

import { useEffect } from "react";
import { GoogleSignInButton } from "./google-signin-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  // Check for authentication success after redirect
  useEffect(() => {
    if (localStorage.getItem("auth_in_progress")) {
      // Clear the flag
      localStorage.removeItem("auth_in_progress");

      // With NextAuth, the session is managed server-side
      // We can just call onSuccess as the redirect handles auth
      onSuccess();
    }
  }, [onSuccess]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Sign in to submit a plate
          </DialogTitle>
          <DialogDescription className="text-center">
            You need to sign in before you can submit a license plate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          <GoogleSignInButton onSuccess={onSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
