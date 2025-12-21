"use client";

import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/lib/actions";
import { useState } from "react";
import { Download } from "lucide-react";

export function ExportCSVButton() {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    try {
      setIsExporting(true);
      const csvContent = await exportToCSV();
      
      // Create a blob and download it
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `net-worth-export-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      size="sm"
    >
      <Download className="size-4" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  );
}

