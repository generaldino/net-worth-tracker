"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { toast } from "@/components/ui/use-toast";
import {
  calculateProjection,
  createProjectionScenario,
  updateProjectionScenario,
  deleteProjectionScenario,
} from "@/lib/actions";
import { formatPercentage } from "@/lib/fx-rates";
import { ProjectionScenarioManager } from "./projection-scenario-manager";
import type { AccountType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMasking } from "@/contexts/masking-context";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import { useProjection } from "@/contexts/projection-context";

export interface ProjectionScenario {
  id: string;
  name: string;
  monthlyIncome: number;
  savingsRate: number;
  timePeriodMonths: number;
  growthRates: Record<AccountType, number>;
  savingsAllocation?: Record<AccountType, number>;
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
  savingsAllocation: Record<AccountType, number>;
};

export function ProjectionCalculator({
  initialScenarios,
  accountTypes: availableAccountTypes,
}: ProjectionCalculatorProps) {
  const router = useRouter();
  const { isMasked } = useMasking();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const { projectionData, setProjectionData, setSelectedScenarioId } = useProjection();
  const [isCalculating, setIsCalculating] = useState(false);
  const [scenarios, setScenarios] = useState<ProjectionScenario[]>(initialScenarios);
  const lastCalculatedScenarioRef = useRef<string | null>(null);

  // Asset account types (exclude Credit_Card and Loan) - memoized to prevent re-renders
  const assetAccountTypes = useMemo<AccountType[]>(
    () => [
      "Current",
      "Savings",
      "Investment",
      "Stock",
      "Crypto",
      "Pension",
      "Commodity",
      "Stock_options",
    ],
    []
  );

  // Filter available account types to only asset types (memoized to prevent re-renders)
  const availableAssetTypes = useMemo(
    () =>
      availableAccountTypes.filter((type) =>
        assetAccountTypes.includes(type as AccountType)
      ) as AccountType[],
    [availableAccountTypes, assetAccountTypes]
  );

  // Initialize growth rates for available account types
  const getDefaultGrowthRates = (): Record<AccountType, number> => {
    const defaults: Record<string, number> = {};
    availableAccountTypes.forEach((type) => {
      defaults[type] = 0;
    });
    return defaults as Record<AccountType, number>;
  };

  // Initialize savings allocation with equal distribution for asset types
  // Round down to nearest whole number, then distribute remainder to make sum = 100
  const getDefaultSavingsAllocation = useCallback((): Record<AccountType, number> => {
    const defaults: Record<string, number> = {};
    if (availableAssetTypes.length > 0) {
      const basePercent = Math.floor(100 / availableAssetTypes.length);
      const remainder = 100 - basePercent * availableAssetTypes.length;
      
      availableAssetTypes.forEach((type, index) => {
        // Distribute base percent to all, then add 1 to first 'remainder' items
        defaults[type] = basePercent + (index < remainder ? 1 : 0);
      });
    }
    return defaults as Record<AccountType, number>;
  }, [availableAssetTypes]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, errors },
    setError,
    clearErrors,
  } = useForm<FormData>({
    defaultValues: {
      monthlyIncome: 5000,
      savingsRate: 30,
      timePeriodMonths: 60,
      growthRates: getDefaultGrowthRates(),
      savingsAllocation: getDefaultSavingsAllocation(),
    },
  });

  // Watch savings allocation to validate sum
  const watchedSavingsAllocation = watch("savingsAllocation");

  // Load scenario when selected
  useEffect(() => {
    if (selectedScenario) {
      const scenario = scenarios.find((s) => s.id === selectedScenario);
      if (scenario) {
        const formData = {
          monthlyIncome: scenario.monthlyIncome,
          savingsRate: scenario.savingsRate,
          timePeriodMonths: scenario.timePeriodMonths,
          growthRates: scenario.growthRates,
          savingsAllocation: scenario.savingsAllocation || getDefaultSavingsAllocation(),
        };
        reset(formData);
      }
    } else {
      // Clear projection data when no scenario is selected
      setProjectionData(null);
      setSelectedScenarioId(null);
      lastCalculatedScenarioRef.current = null;
    }
  }, [selectedScenario, scenarios, reset, getDefaultSavingsAllocation, setProjectionData, setSelectedScenarioId]);

  // Auto-calculate when scenario form data is loaded (separate effect to avoid infinite loop)
  useEffect(() => {
    if (selectedScenario && selectedScenario !== lastCalculatedScenarioRef.current) {
      const scenario = scenarios.find((s) => s.id === selectedScenario);
      if (scenario) {
        const formData = {
          monthlyIncome: scenario.monthlyIncome,
          savingsRate: scenario.savingsRate,
          timePeriodMonths: scenario.timePeriodMonths,
          growthRates: scenario.growthRates,
          savingsAllocation: scenario.savingsAllocation || getDefaultSavingsAllocation(),
        };

        // Auto-calculate projection when scenario is loaded
        const calculateWithScenario = async () => {
          setIsCalculating(true);
          try {
            const allocationSum = availableAssetTypes.reduce(
              (sum, type) => sum + (formData.savingsAllocation[type] || 0),
              0
            );

            if (Math.abs(allocationSum - 100) <= 0.01) {
              const result = await calculateProjection({
                monthlyIncome: formData.monthlyIncome,
                savingsRate: formData.savingsRate,
                timePeriodMonths: formData.timePeriodMonths,
                growthRates: formData.growthRates,
                savingsAllocation: formData.savingsAllocation,
              });
              setProjectionData(result);
              setSelectedScenarioId(selectedScenario);
              lastCalculatedScenarioRef.current = selectedScenario;
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to calculate projection";
            toast({
              variant: "destructive",
              title: "Error",
              description: errorMessage,
            });
          } finally {
            setIsCalculating(false);
          }
        };

        // Small delay to ensure form has been reset
        const timeoutId = setTimeout(() => {
          calculateWithScenario();
        }, 100);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [selectedScenario, scenarios, getDefaultSavingsAllocation, availableAssetTypes, setProjectionData, setSelectedScenarioId]);

  const onSubmit = async (data: FormData) => {
    // Validate that savings allocation percentages sum to 100%
    const allocationSum = availableAssetTypes.reduce(
      (sum, type) => sum + (data.savingsAllocation[type] || 0),
      0
    );

    if (Math.abs(allocationSum - 100) > 0.01) {
      setError("savingsAllocation", {
        type: "manual",
        message: `Savings allocation must sum to 100%. Current sum: ${formatPercentage(allocationSum)}`,
      });
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: `Savings allocation must sum to 100%. Current sum: ${formatPercentage(allocationSum)}`,
      });
      return;
    }

    clearErrors("savingsAllocation");
    setIsCalculating(true);
    try {
      const result = await calculateProjection({
        monthlyIncome: data.monthlyIncome,
        savingsRate: data.savingsRate,
        timePeriodMonths: data.timePeriodMonths,
        growthRates: data.growthRates,
        savingsAllocation: data.savingsAllocation,
      });

      setProjectionData(result);
      setSelectedScenarioId(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to calculate projection";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveScenario = async (name: string) => {
    const formData = watch();
    try {
      // Validate savings allocation
      const allocationSum = availableAssetTypes.reduce(
        (sum, type) => sum + (formData.savingsAllocation[type] || 0),
        0
      );

      if (Math.abs(allocationSum - 100) > 0.01) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: `Savings allocation must sum to 100%. Current sum: ${formatPercentage(allocationSum)}`,
        });
        return;
      }

      // Ensure all account types have growth rates
      const growthRates = { ...formData.growthRates };
      availableAccountTypes.forEach((type) => {
        if (!(type in growthRates)) {
          growthRates[type as AccountType] = 0;
        }
      });

      // Ensure all asset types have savings allocation
      const savingsAllocation = { ...formData.savingsAllocation };
      availableAssetTypes.forEach((type) => {
        if (!(type in savingsAllocation)) {
          savingsAllocation[type] = 0;
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
          savingsAllocation,
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
          savingsAllocation,
        });

        if (result.success && result.scenario) {
          toast({
            title: "Success",
            description: "Scenario saved successfully",
          });
          router.refresh();
        }
      }
    } catch {
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
            savingsAllocation: getDefaultSavingsAllocation(),
          });
        }
        toast({
          title: "Success",
          description: "Scenario deleted successfully",
        });
        router.refresh();
      }
    } catch {
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Savings Allocation by Account Type (%)</Label>
                <div className="text-sm text-muted-foreground">
                  Total:{" "}
                  <span
                    className={
                      Math.abs(
                        availableAssetTypes.reduce(
                          (sum, type) =>
                            sum + (watchedSavingsAllocation?.[type] || 0),
                          0
                        ) - 100
                      ) > 0.01
                        ? "text-destructive font-semibold"
                        : "text-green-600 font-semibold"
                    }
                  >
                    {availableAssetTypes
                      .reduce(
                        (sum, type) =>
                          sum + (watchedSavingsAllocation?.[type] || 0),
                        0
                      )
                      .toFixed(2)}
                    %
                  </span>
                </div>
              </div>
              {errors.savingsAllocation && (
                <p className="text-sm text-destructive">
                  {errors.savingsAllocation.message}
                </p>
              )}
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {availableAssetTypes.map((accountType) => (
                  <div key={accountType} className="space-y-2">
                    <Label htmlFor={`savingsAllocation-${accountType}`}>
                      {accountType.replace(/_/g, " ").replace(/\b\w/g, (l) =>
                        l.toUpperCase()
                      )}
                    </Label>
                    <Input
                      id={`savingsAllocation-${accountType}`}
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      {...register(
                        `savingsAllocation.${accountType as AccountType}`,
                        {
                          required: true,
                          min: 0,
                          max: 100,
                          valueAsNumber: true,
                        }
                      )}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Specify how much of your monthly savings will be allocated to
                each account type. Percentages must sum to 100%.
              </p>
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

      <Card>
        <CardHeader>
          <CardTitle>Projection Results</CardTitle>
        </CardHeader>
        <CardContent>
          {projectionData ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label className="text-muted-foreground">Current Net Worth</Label>
                  <p className="text-2xl font-bold">
                    {isMasked
                      ? "••••••"
                      : formatCurrencyAmount(projectionData.currentNetWorth, "GBP")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Projected Net Worth</Label>
                  <p className="text-2xl font-bold">
                    {isMasked
                      ? "••••••"
                      : formatCurrencyAmount(projectionData.finalNetWorth, "GBP")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Growth</Label>
                  <p className="text-2xl font-bold">
                    {isMasked
                      ? "••••••"
                      : formatCurrencyAmount(projectionData.totalGrowth, "GBP")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Growth %</Label>
                  <p className="text-2xl font-bold">
                    {formatPercentage(projectionData.growthPercentage)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                View the projection chart by selecting &quot;Projection&quot; in the Charts section above.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">
                {selectedScenario
                  ? "Select a scenario or calculate a projection to view results"
                  : "Calculate a projection or select a saved scenario to view results"}
              </p>
              <p className="text-sm text-muted-foreground">
                Enter your projection parameters above and click &quot;Calculate Projection&quot;
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

