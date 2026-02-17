"use client";

import { useState, useCallback } from "react";
import { ScanSearch, Check } from "lucide-react";
import { OnboardingHeader, OnboardingFooter } from "@/components/Onboarding";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const ANALYSIS_TARGET_OPTIONS = [
  {
    value: "per_prompt",
    label: "Analyze each message",
    description:
      "Routes each request based on the user's message content. Best for applications with varied query types.",
  },
  {
    value: "per_system_prompt",
    label: "Analyze system instructions",
    description:
      "Routes based on your system prompt. Classification is cached for faster subsequent requests. Falls back to your default model if no system prompt is provided.",
  },
] as const;

interface SetAnalysisTargetStepProps {
  onContinue: () => void;
  onBack: () => void;
}

export function SetAnalysisTargetStep({ onContinue, onBack }: SetAnalysisTargetStepProps) {
  const [selected, setSelected] = useState<string>("per_prompt");
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = useCallback(async () => {
    try {
      setIsSaving(true);
      await authClient.updateUser({ analysisTarget: selected });
      toast.success("Analysis target set", {
        description:
          selected === "per_system_prompt"
            ? "Requests will be routed based on your system instructions."
            : "Each request will be routed based on the user's message.",
      });
      onContinue();
    } catch {
      toast.error("Failed to save analysis target", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }, [selected, onContinue]);

  return (
    <>
      <OnboardingHeader
        icon={<ScanSearch className="h-6 w-6 text-accent-foreground" />}
        title="Choose your analysis target"
        description="Control how the router classifies requests when using auto-routing mode. This determines which part of the request is analyzed to select the best model."
      />

      <div className="flex flex-col gap-3">
        {ANALYSIS_TARGET_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelected(option.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border bg-card px-5 py-4 text-left transition-colors cursor-pointer",
                "hover:bg-accent/50",
                isSelected ? "border-foreground/30 bg-accent" : "border-border",
              )}
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {option.description}
                </span>
              </div>
              {isSelected && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground ml-4">
                  <Check className="h-3 w-3 text-background" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-card px-5 py-4">
        <OnboardingFooter
          onBack={onBack}
          onContinue={handleContinue}
          continueDisabled={isSaving}
          continueLabel={isSaving ? "Saving..." : "Continue"}
          hint="You can change this later in settings"
        />
      </div>
    </>
  );
}
