"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteUser } from "@/app/actions/sharing";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

export function InviteUserDialog({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const normalizedEmail = email.toLowerCase().trim();

    // Validate @gmail.com
    if (!normalizedEmail.endsWith("@gmail.com")) {
      toast.error("Only Gmail addresses are allowed (@gmail.com)");
      setIsLoading(false);
      return;
    }

    const result = await inviteUser(normalizedEmail);

    if (result.success) {
      setInvitedEmail(result.inviteeEmail || normalizedEmail);
      setEmail("");
      onSuccess?.();
    } else {
      toast.error(result.error || "Failed to create invitation");
    }

    setIsLoading(false);
  };

  const invitationText = invitedEmail
    ? `You've been invited to view my Wealth Tracker dashboard!

To get access, please visit:
${siteUrl}

And sign in with your Google account (${invitedEmail}).

Once you sign in, you'll automatically have access to view the dashboard.`
    : "";

  const handleCopy = async () => {
    if (invitationText) {
      await navigator.clipboard.writeText(invitationText);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (invitedEmail) {
    return (
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invitation Created</DialogTitle>
          <DialogDescription>
            Copy and share this message with {invitedEmail}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <textarea
              readOnly
              value={invitationText}
              className="w-full min-h-[150px] p-3 border rounded-lg bg-muted font-mono text-sm resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="absolute top-2 right-2"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setInvitedEmail(null);
                setEmail("");
              }}
              className="flex-1"
            >
              Invite Another
            </Button>
            <Button
              onClick={() => {
                setInvitedEmail(null);
                setEmail("");
              }}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Invite User</DialogTitle>
        <DialogDescription>
          Enter a Gmail address to create an invitation. You&apos;ll get a message to share with them.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address (Gmail only)</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Only @gmail.com addresses are allowed
          </p>
        </div>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Creating..." : "Create Invitation"}
        </Button>
      </form>
    </DialogContent>
  );
}
