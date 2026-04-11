"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  AccountType,
  accountTypes,
  supportedCurrencies,
  currencyLabels,
} from "@/lib/types";
import type { Currency } from "@/lib/fx-rates";
import { createAccount } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { useForm, Controller } from "react-hook-form";
import { getCategoryFromType } from "@/lib/account-helpers";

type FormData = {
  name: string;
  type: AccountType;
  owner: string;
  currency: Currency;
};

export function AddAccountFormFields() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      type: "Current",
      owner: "",
      currency: "GBP",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const result = await createAccount({
        ...data,
        category: getCategoryFromType(data.type),
        isISA: false,
      });

      if (result.success && result.account) {
        reset();
        router.refresh();
        toast({
          title: "Success",
          description: "Account created successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to create account",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while creating the account",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Account Name</Label>
        <Input
          id="name"
          {...register("name", { required: "Please enter an account name" })}
          placeholder="e.g., Barclays Current"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="owner">Account Owner</Label>
        <Input
          id="owner"
          {...register("owner", { required: "Please enter an account owner" })}
          placeholder="e.g., John Doe"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Account Type</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((accountType) => (
                  <SelectItem key={accountType} value={accountType}>
                    {accountType
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {supportedCurrencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currencyLabels[currency]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2">
        <DialogClose asChild>
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Account"}
          </Button>
        </DialogClose>
      </DialogFooter>
    </form>
  );
}
