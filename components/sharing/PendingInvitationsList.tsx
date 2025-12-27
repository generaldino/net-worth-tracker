"use client";

import { Button } from "@/components/ui/button";
import { cancelInvitation } from "@/app/actions/sharing";
import { toast } from "sonner";
import { X } from "lucide-react";

interface PendingInvitation {
  id: string;
  email: string;
  createdAt: Date;
}

export function PendingInvitationsList({
  invitations,
  onCancel,
}: {
  invitations: PendingInvitation[];
  onCancel?: () => void;
}) {
  const handleCancel = async (invitationId: string, email: string) => {
    if (!confirm(`Cancel invitation for ${email}?`)) {
      return;
    }

    const result = await cancelInvitation(invitationId);
    if (result.success) {
      toast.success("Invitation cancelled");
      onCancel?.();
    } else {
      toast.error(result.error || "Failed to cancel invitation");
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No pending invitations.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div className="flex flex-col">
            <span className="font-medium">{invitation.email}</span>
            <span className="text-sm text-muted-foreground">
              Sent {new Date(invitation.createdAt).toLocaleDateString()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCancel(invitation.id, invitation.email)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

