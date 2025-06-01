import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { AddAccountForm } from "@/components/add-account-form";

export function AddAccountButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <AddAccountForm />
    </Dialog>
  );
}
