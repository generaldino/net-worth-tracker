"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type Account, type MonthlyEntry, getCurrentValue } from "@/lib/data"
import { Plus } from "lucide-react"

interface AddMonthDialogProps {
  account: Account
  onAddMonth: (month: string, entry: MonthlyEntry) => void
}

export function AddMonthDialog({ account, onAddMonth }: AddMonthDialogProps) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState("")
  const [endingBalance, setEndingBalance] = useState("")
  const [cashIn, setCashIn] = useState("")
  const [cashOut, setCashOut] = useState("")

  const currentValue = getCurrentValue(account.id)

  const handleSubmit = () => {
    if (!month) {
      alert("Please select a month")
      return
    }

    const entry: MonthlyEntry = {
      accountId: account.id,
      endingBalance: Number.parseFloat(endingBalance) || 0,
      cashIn: Number.parseFloat(cashIn) || 0,
      cashOut: Number.parseFloat(cashOut) || 0,
    }

    onAddMonth(month, entry)

    // Reset form and close dialog
    setMonth("")
    setEndingBalance("")
    setCashIn("")
    setCashOut("")
    setOpen(false)
  }

  // Get current month in YYYY-MM format for the month input max value
  const currentDate = new Date()
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Month
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Month for {account.name}</DialogTitle>
          <DialogDescription>
            Enter the month-end balance and cash flows for this account.
            <br />
            <span className="text-sm text-muted-foreground">Current balance: £{currentValue.toLocaleString()}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              max={currentMonth}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ending-balance">Ending Balance</Label>
            <Input
              id="ending-balance"
              type="number"
              value={endingBalance}
              onChange={(e) => setEndingBalance(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cash-in">Cash In</Label>
            <Input
              id="cash-in"
              type="number"
              value={cashIn}
              onChange={(e) => setCashIn(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cash-out">Cash Out</Label>
            <Input
              id="cash-out"
              type="number"
              value={cashOut}
              onChange={(e) => setCashOut(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="submit" onClick={handleSubmit} className="w-full sm:w-auto">
            Add Month
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
