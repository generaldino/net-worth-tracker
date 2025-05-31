"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { type Account, type AccountType, accountTypes } from "@/lib/data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EditAccountDialogProps {
  account: Account | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateAccount: (account: Account) => void
}

export function EditAccountDialog({ account, open, onOpenChange, onUpdateAccount }: EditAccountDialogProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState<AccountType>("current")
  const [isISA, setIsISA] = useState(false)

  useEffect(() => {
    if (account) {
      setName(account.name)
      setType(account.type)
      setIsISA(account.isISA)
    }
  }, [account])

  const handleSubmit = () => {
    if (!account || !name) {
      alert("Please fill in all required fields")
      return
    }

    onUpdateAccount({
      ...account,
      name,
      type,
      isISA,
    })

    onOpenChange(false)
  }

  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>Update the details of your financial account.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Account Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-type">Account Type</Label>
            <Select value={type} onValueChange={(value: AccountType) => setType(value)}>
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
          <div className="flex items-center space-x-2">
            <Checkbox id="edit-isa" checked={isISA} onCheckedChange={(checked) => setIsISA(checked === true)} />
            <Label
              htmlFor="edit-isa"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              ISA Account
            </Label>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="submit" onClick={handleSubmit} className="w-full sm:w-auto">
            Update Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
