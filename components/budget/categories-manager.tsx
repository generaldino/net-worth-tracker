"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { colorVariantsBackground } from "@/lib/color-variants";
import { CategoryDialog } from "@/components/budget/category-dialog";
import {
  archiveCategory,
  type CategoryRow,
} from "@/app/actions/expense-categories";

interface CategoriesManagerProps {
  categories: CategoryRow[];
}

function swatch(color: string) {
  return (
    colorVariantsBackground[color as keyof typeof colorVariantsBackground] ??
    colorVariantsBackground.blue
  );
}

export function CategoriesManager({ categories }: CategoriesManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<CategoryRow | null>(null);
  const [archiveRow, setArchiveRow] = useState<CategoryRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const openAdd = () => {
    setEditRow(null);
    setDialogOpen(true);
  };

  const openEdit = (row: CategoryRow) => {
    setEditRow(row);
    setDialogOpen(true);
  };

  const handleArchive = async () => {
    if (!archiveRow) return;
    setPendingId(archiveRow.id);
    const result = await archiveCategory(archiveRow.id);
    setPendingId(null);

    if (result.success) {
      toast({
        title: "Category archived",
        description: `${archiveRow.name} is hidden from pickers. Past expenses keep their label.`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Archive failed",
        description: result.error,
      });
    }
    setArchiveRow(null);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Tags className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Categories</h2>
        </div>
        <Button onClick={openAdd} size="sm" variant="outline">
          <Plus className="size-4" />
          <span className="hidden sm:inline">New category</span>
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Tags className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No categories yet</p>
          <Button onClick={openAdd} size="sm" className="mt-4">
            <Plus className="size-4" />
            New category
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const busy = pendingId === cat.id;
            return (
              <div
                key={cat.id}
                className="group flex items-center gap-2 rounded-full border py-1 pl-2 pr-1 text-sm"
              >
                <span
                  className={cn("size-2.5 rounded-full", swatch(cat.color))}
                />
                <span className="font-medium">{cat.name}</span>
                {cat.monthlyTarget !== null && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    £{cat.monthlyTarget.toLocaleString("en-GB")}/mo
                  </span>
                )}
                {cat.isFixed && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 text-[10px] font-normal"
                  >
                    fixed
                  </Badge>
                )}
                {cat.excludeFromSpend && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 text-[10px] font-normal"
                  >
                    not spending
                  </Badge>
                )}
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    title="Edit"
                    disabled={busy}
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil className="size-3" />
                    <span className="sr-only">Edit {cat.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-destructive hover:text-destructive"
                    title="Archive"
                    disabled={busy}
                    onClick={() => setArchiveRow(cat)}
                  >
                    {busy ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                    <span className="sr-only">Archive {cat.name}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editRow}
        onSaved={() => router.refresh()}
      />

      <AlertDialog
        open={archiveRow !== null}
        onOpenChange={(open) => !open && setArchiveRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this category?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveRow?.name} will stop appearing when you categorise
              expenses. Expenses already using it keep their label, so your
              historic breakdown is unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
