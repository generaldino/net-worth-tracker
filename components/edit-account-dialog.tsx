"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAccount } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import {
  Account,
  AccountType,
  accountTypes,
  AccountCategory,
  accountCategories,
  supportedCurrencies,
  currencyLabels,
} from "@/lib/types";
import type { Currency } from "@/lib/fx-rates";

interface EditAccountDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAccountDialog({
  account,
  open,
  onOpenChange,
}: EditAccountDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("Current");
  const [category, setCategory] = useState<AccountCategory>("Investments");
  const [currency, setCurrency] = useState<Currency>("GBP");
  const [isISA, setIsISA] = useState(false);
  const [owner, setOwner] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setCategory(account.category || "Investments");
      setCurrency(account.currency || "GBP");
      setIsISA(account.isISA);
      setOwner(account.owner);
    }
  }, [account]);

  const handleSubmit = async () => {
    if (!account || !name) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateAccount({
        id: account.id,
        name,
        type,
        category,
        currency,
        isISA,
        owner,
      });

      if (result.success) {
        onOpenChange(false);
        router.refresh();
        toast({
          title: "Success",
          description: "Account updated successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to update account",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update the details of your financial account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Account Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-owner">Account Owner</Label>
            <Input
              id="edit-owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-type">Account Type</Label>
            <Select
              value={type}
              onValueChange={(value: AccountType) => setType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((accountType) => (
                  <SelectItem key={accountType} value={accountType}>
                    {accountType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Account Category</Label>
            <Select
              value={category}
              onValueChange={(value: AccountCategory) => setCategory(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountCategories.map((accountCategory) => (
                  <SelectItem key={accountCategory} value={accountCategory}>
                    {accountCategory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={(value: Currency) => setCurrency(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedCurrencies.map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    {currencyLabels[curr]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-isa"
              checked={isISA}
              onCheckedChange={(checked) => setIsISA(checked === true)}
            />
            <Label
              htmlFor="edit-isa"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              ISA Account
            </Label>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="submit"
            onClick={handleSubmit}
            className="w-full sm:w-auto"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Update Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
