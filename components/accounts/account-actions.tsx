import { Button } from "@/components/ui/button";
import { Edit, Trash2, Archive, ArchiveRestore, ChevronUp, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type Account } from "@/lib/types";
import { deleteAccount, toggleAccountClosed, reorderAccount } from "@/lib/actions";
import { toast } from "@/components/ui/use-toast";
import { useState, useTransition } from "react";

interface AccountActionsProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  stopPropagation?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

export function AccountActions({
  account,
  onEdit,
  onDelete,
  stopPropagation,
  isFirst = false,
  isLast = false,
}: AccountActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleReorder = (direction: "up" | "down") => {
    startTransition(async () => {
      const result = await reorderAccount(account.id, direction);
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to reorder account",
          variant: "destructive",
        });
      }
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccount(account.id);
      if (result.success) {
        onDelete(account.id);
        toast({
          title: "Account deleted",
          description: "The account has been successfully deleted.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete account",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleClosed = async () => {
    try {
      const result = await toggleAccountClosed(account.id, !account.isClosed);
      if (result.success) {
        toast({
          title: account.isClosed ? "Account reopened" : "Account closed",
          description: `The account has been ${
            account.isClosed ? "reopened" : "closed"
          }.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update account status",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => stopPropagation && e.stopPropagation()}
    >
      {/* Reorder buttons */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleReorder("up")}
        disabled={isFirst || isPending}
        className="h-8 w-8"
        title="Move up"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleReorder("down")}
        disabled={isLast || isPending}
        className="h-8 w-8"
        title="Move down"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      
      {/* Existing action buttons */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(account)}
        className="h-8 w-8"
        title="Edit account"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleClosed}
        className="h-8 w-8"
        title={account.isClosed ? "Reopen account" : "Close account"}
      >
        {account.isClosed ? (
          <ArchiveRestore className="h-4 w-4" />
        ) : (
          <Archive className="h-4 w-4" />
        )}
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete account"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this account? This action cannot
              be undone and will permanently delete all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
