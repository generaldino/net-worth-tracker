"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useForm, Controller } from "react-hook-form";
import { toast } from "@/components/ui/use-toast";
import {
  calculateProjection,
  createProjectionScenario,
  updateProjectionScenario,
  deleteProjectionScenario,
} from "@/lib/actions";
import { ProjectionChart } from "./projection-chart";
import { ProjectionScenarioManager } from "./projection-scenario-manager";
import type { AccountType } from "@/lib/types";
import { useRouter } from "next/navigation";

interface ProjectionScenario {
  id: string;
  name: string;
  monthlyIncome: number;
  savingsRate: number;
  timePeriodMonths: number;
  growthRates: Record<AccountType, number>;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectionCalculatorProps {
  initialScenarios: ProjectionScenario[];
  accountTypes: string[];
}

type FormData = {
  monthlyIncome: number;
  savingsRate: number;
  timePeriodMonths: number;
  growthRates: Record<AccountType, number>;
};

export function ProjectionCalculator({
  initialScenarios,
  accountTypes: availableAccountTypes,
}: ProjectionCalculatorProps) {
  const router = useRouter();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [projectionData, setProjectionData] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [scenarios, setScenarios] = useState<ProjectionScenario[]>(initialScenarios);

  // Initialize growth rates for available account types
  const getDefaultGrowthRates = (): Record<AccountType, number> => {
    const defaults: Record<string, number> = {};
    availableAccountTypes.forEach((type) => {
      defaults[type] = 0;
    });
    return defaults as Record<AccountType, number>;
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      monthlyIncome: 5000,
      savingsRate: 30,
      timePeriodMonths: 60,
      growthRates: getDefaultGrowthRates(),
    },
  });

  // Load scenario when selected
  useEffect(() => {
    if (selectedScenario) {
      const scenario = scenarios.find((s) => s.id === selectedScenario);
      if (scenario) {
        reset({
          monthlyIncome: scenario.monthlyIncome,
          savingsRate: scenario.savingsRate,
          timePeriodMonths: scenario.timePeriodMonths,
          growthRates: scenario.growthRates,
        });
      }
    }
  }, [selectedScenario, scenarios, reset]);

  const onSubmit = async (data: FormData) => {
    setIsCalculating(true);
    try {
      const result = await calculateProjection({
        monthlyIncome: data.monthlyIncome,
        savingsRate: data.savingsRate,
        timePeriodMonths: data.timePeriodMonths,
        growthRates: data.growthRates,
      });

      setProjectionData(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to calculate projection",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveScenario = async (name: string) => {
    const formData = watch();
    try {
      // Ensure all account types have growth rates
      const growthRates = { ...formData.growthRates };
      availableAccountTypes.forEach((type) => {
        if (!(type in growthRates)) {
          growthRates[type as AccountType] = 0;
        }
      });

      if (selectedScenario) {
        // Update existing scenario
        const result = await updateProjectionScenario(selectedScenario, {
          name,
          monthlyIncome: formData.monthlyIncome,
          savingsRate: formData.savingsRate,
          timePeriodMonths: formData.timePeriodMonths,
          growthRates,
        });

        if (result.success) {
          toast({
            title: "Success",
            description: "Scenario updated successfully",
          });
          router.refresh();
        }
      } else {
        // Create new scenario
        const result = await createProjectionScenario({
          name,
          monthlyIncome: formData.monthlyIncome,
          savingsRate: formData.savingsRate,
          timePeriodMonths: formData.timePeriodMonths,
          growthRates,
        });

        if (result.success && result.scenario) {
          toast({
            title: "Success",
            description: "Scenario saved successfully",
          });
          router.refresh();
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save scenario",
      });
    }
  };

  const handleDeleteScenario = async (id: string) => {
    try {
      const result = await deleteProjectionScenario(id);
      if (result.success) {
        setScenarios(scenarios.filter((s) => s.id !== id));
        if (selectedScenario === id) {
          setSelectedScenario(null);
          reset({
            monthlyIncome: 5000,
            savingsRate: 30,
            timePeriodMonths: 60,
            growthRates: getDefaultGrowthRates(),
          });
        }
        toast({
          title: "Success",
          description: "Scenario deleted successfully",
        });
        router.refresh();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete scenario",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Wealth Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="monthlyIncome">Monthly Income</Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  step="0.01"
                  {...register("monthlyIncome", {
                    required: true,
                    min: 0,
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="savingsRate">Savings Rate (%)</Label>
                <Input
                  id="savingsRate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...register("savingsRate", {
                    required: true,
                    min: 0,
                    max: 100,
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timePeriodMonths">Time Period (Months)</Label>
                <Input
                  id="timePeriodMonths"
                  type="number"
                  step="1"
                  min="1"
                  max="600"
                  {...register("timePeriodMonths", {
                    required: true,
                    min: 1,
                    max: 600,
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Annual Growth Rates by Account Type (%)</Label>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableAccountTypes.map((accountType) => (
                  <div key={accountType} className="space-y-2">
                    <Label htmlFor={`growthRate-${accountType}`}>
                      {accountType.replace(/_/g, " ").replace(/\b\w/g, (l) =>
                        l.toUpperCase()
                      )}
                    </Label>
                    <Input
                      id={`growthRate-${accountType}`}
                      type="number"
                      step="0.1"
                      {...register(`growthRates.${accountType as AccountType}`, {
                        required: true,
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isCalculating || isSubmitting}>
                {isCalculating ? "Calculating..." : "Calculate Projection"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ProjectionScenarioManager
        scenarios={scenarios}
        selectedScenario={selectedScenario}
        onSelectScenario={setSelectedScenario}
        onSaveScenario={handleSaveScenario}
        onDeleteScenario={handleDeleteScenario}
      />

      {projectionData && (
        <Card>
          <CardHeader>
            <CardTitle>Projection Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <div>
                <Label className="text-muted-foreground">Current Net Worth</Label>
                <p className="text-2xl font-bold">
                  £{projectionData.currentNetWorth.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Projected Net Worth</Label>
                <p className="text-2xl font-bold">
                  £{projectionData.finalNetWorth.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Growth</Label>
                <p className="text-2xl font-bold">
                  £{projectionData.totalGrowth.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Growth %</Label>
                <p className="text-2xl font-bold">
                  {projectionData.growthPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
            <ProjectionChart data={projectionData.projectionData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

