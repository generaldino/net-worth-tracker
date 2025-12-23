"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProjectionScenario {
  id: string;
  name: string;
  monthlyIncome: number;
  savingsRate: number;
  timePeriodMonths: number;
  growthRates: Record<string, number>;
  savingsAllocation?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectionScenarioManagerProps {
  scenarios: ProjectionScenario[];
  selectedScenario: string | null;
  onSelectScenario: (id: string | null) => void;
  onSaveScenario: (name: string) => Promise<void>;
  onDeleteScenario: (id: string) => Promise<void>;
}

export function ProjectionScenarioManager({
  scenarios,
  selectedScenario,
  onSelectScenario,
  onSaveScenario,
  onDeleteScenario,
}: ProjectionScenarioManagerProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  const handleSave = async () => {
    if (!scenarioName.trim()) {
      return;
    }
    await onSaveScenario(scenarioName.trim());
    setSaveDialogOpen(false);
    setScenarioName("");
  };

  const selectedScenarioData = scenarios.find(
    (s) => s.id === selectedScenario
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Scenarios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Select
            value={selectedScenario || "none"}
            onValueChange={(value) =>
              onSelectScenario(value === "none" ? null : value)
            }
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select a scenario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {scenarios.map((scenario) => (
                <SelectItem key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Scenario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Projection Scenario</DialogTitle>
                <DialogDescription>
                  {selectedScenario
                    ? "Update the name for this scenario"
                    : "Enter a name for this projection scenario"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="scenario-name">Scenario Name</Label>
                  <Input
                    id="scenario-name"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    placeholder="e.g., Conservative Growth"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSave();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSaveDialogOpen(false);
                    setScenarioName("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!scenarioName.trim()}>
                  {selectedScenario ? "Update" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {selectedScenario && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the scenario &quot;{selectedScenarioData?.name}&quot;. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (selectedScenario) {
                        onDeleteScenario(selectedScenario);
                      }
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {scenarios.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No saved scenarios. Create a projection and save it to get started.
          </p>
        )}

        {selectedScenarioData && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-semibold">{selectedScenarioData.name}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Monthly Income: </span>
                <span>£{selectedScenarioData.monthlyIncome.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Savings Rate: </span>
                <span>{selectedScenarioData.savingsRate}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Time Period: </span>
                <span>{selectedScenarioData.timePeriodMonths} months</span>
              </div>
              <div>
                <span className="text-muted-foreground">Created: </span>
                <span>
                  {new Date(selectedScenarioData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

