import { Button } from "@/components/ui/button";
import { Edit, Trash2, Archive, ArchiveRestore } from "lucide-react";
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
import { deleteAccount, toggleAccountClosed } from "@/lib/actions";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";

interface AccountActionsProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  stopPropagation?: boolean;
}

export function AccountActions({
  account,
  onEdit,
  onDelete,
  stopPropagation,
}: AccountActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

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
    } catch (error) {
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
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => stopPropagation && e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(account)}
        className="h-8 w-8"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleClosed}
        className="h-8 w-8"
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
