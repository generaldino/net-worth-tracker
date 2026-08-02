"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { colorVariantsBackground } from "@/lib/color-variants";
import {
  createCategory,
  updateCategory,
  type CategoryRow,
} from "@/app/actions/expense-categories";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this category; otherwise it creates one. */
  category: CategoryRow | null;
  onSaved: () => void;
}

const COLORS = Object.keys(colorVariantsBackground) as Array<
  keyof typeof colorVariantsBackground
>;

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: CategoryDialogProps) {
  const isEdit = category !== null;

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("blue");
  const [excludeFromSpend, setExcludeFromSpend] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (category) {
      setName(category.name);
      setColor(category.color);
      setExcludeFromSpend(category.excludeFromSpend);
    } else {
      setName("");
      setColor("blue");
      setExcludeFromSpend(false);
    }
  }, [open, category]);

  const canSave = name.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    setIsSaving(true);
    const input = { name, color, excludeFromSpend };
    const result = isEdit
      ? await updateCategory(category.id, input)
      : await createCategory(input);
    setIsSaving(false);

    if (result.success) {
      toast({
        title: isEdit ? "Category updated" : "Category created",
        description: name.trim(),
      });
      onSaved();
      onOpenChange(false);
    } else {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: result.error,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Categories group your spending so you can see where the money goes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Groceries"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-6 rounded-full border-2 transition",
                    colorVariantsBackground[c],
                    color === c
                      ? "border-foreground scale-110"
                      : "border-transparent",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="exclude-spend" className="text-sm">
                Not spending
              </Label>
              <p className="text-xs text-muted-foreground">
                Excludes this category from spend totals and savings rate. Use
                it for card payments and transfers between your own accounts.
              </p>
            </div>
            <Switch
              id="exclude-spend"
              checked={excludeFromSpend}
              onCheckedChange={setExcludeFromSpend}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
