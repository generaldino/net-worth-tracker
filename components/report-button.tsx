"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { submitReport } from "@/app/actions";
import { Textarea } from "@/components/ui/textarea";

interface ReportButtonProps {
  licensePlateId: string;
  plateNumber: string;
}

export function ReportButton({
  licensePlateId,
  plateNumber,
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reportType) {
      toast.error("Please select a report type");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitReport({
        licensePlateId,
        reportType,
        description,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success("Report submitted", {
        description: "Thank you for helping us maintain quality content",
      });
      setIsOpen(false);
      setReportType("");
      setDescription("");
    } catch (error) {
      toast.error("Failed to submit report", {
        description: "Please try again later",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <Flag className="h-4 w-4 mr-2" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an issue with {plateNumber}</DialogTitle>
          <DialogDescription>
            This will be reviewed by our team.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mismatch">
                  Plate number doesn't match photo
                </SelectItem>
                <SelectItem value="duplicate">Duplicate entry</SelectItem>
                <SelectItem value="other">Other issue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Describe the issue in detail..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
