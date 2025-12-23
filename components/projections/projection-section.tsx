"use client";

import { useState } from "react";
import { ProjectionCalculator } from "./projection-calculator";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ProjectionScenario } from "./projection-calculator";

interface ProjectionSectionProps {
  initialScenarios: ProjectionScenario[];
  accountTypes: string[];
}

export function ProjectionSection({
  initialScenarios,
  accountTypes,
}: ProjectionSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl">
                Wealth Projection Setup
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6">
            <ProjectionCalculator
              initialScenarios={initialScenarios}
              accountTypes={accountTypes}
            />
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

