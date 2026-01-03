"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateAccount } from "@/lib/actions";
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
import { ArrowLeft } from "lucide-react";

interface EditAccountFullPageProps {
  account: Account;
}

export function EditAccountFullPage({ account }: EditAccountFullPageProps) {
  const router = useRouter();
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<AccountType>(account.type);
  const [category, setCategory] = useState<AccountCategory>(account.category || "Investments");
  const [currency, setCurrency] = useState<Currency>(account.currency || "GBP");
  const [isISA, setIsISA] = useState(account.isISA);
  const [owner, setOwner] = useState(account.owner);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name) {
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
        router.push("/");
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Account</CardTitle>
            <CardDescription>
              Update the details of your financial account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
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
            <div className="grid gap-4 sm:grid-cols-2">
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
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update Account"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
