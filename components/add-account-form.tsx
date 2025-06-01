import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddAccountFormFields } from "@/components/add-account-form-fields";

export function AddAccountForm() {
  return (
    <DialogContent className="sm:max-w-[425px] mx-4 max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Account</DialogTitle>
        <DialogDescription>
          Enter the details of your new financial account.
        </DialogDescription>
      </DialogHeader>
      <AddAccountFormFields />
    </DialogContent>
  );
}
