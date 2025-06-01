import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
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
import { deleteAccount } from "@/lib/actions";
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
  stopPropagation = false,
}: AccountActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          handleClick(e);
          onEdit(account);
        }}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" onClick={handleClick}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{account.name}"? This will
              permanently delete the account and all its associated monthly
              entries. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const result = await deleteAccount(account.id);
                if (result.success) {
                  toast({
                    title: "Success",
                    description: "Account deleted successfully",
                  });
                  onDelete(account.id);
                  setIsOpen(false);
                } else {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "Failed to delete account",
                  });
                }
              }}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
