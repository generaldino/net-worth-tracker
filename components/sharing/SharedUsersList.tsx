"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { revokeAccess } from "@/app/actions/sharing";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface SharedUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  sharedAt: Date;
}

export function SharedUsersList({
  users,
  onRevoke,
}: {
  users: SharedUser[];
  onRevoke?: () => void;
}) {
  const handleRevoke = async (userId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to revoke access for ${email}? They will no longer be able to view your dashboard.`
      )
    ) {
      return;
    }

    const result = await revokeAccess(userId);
    if (result.success) {
      toast.success("Access revoked successfully");
      onRevoke?.();
    } else {
      toast.error(result.error || "Failed to revoke access");
    }
  };

  if (users.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No users have access yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => {
        const initials = user.name
          ? user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .substring(0, 2)
          : user.email.substring(0, 2).toUpperCase();

        return (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name || user.email} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{user.name || user.email}</span>
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRevoke(user.id, user.email)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

