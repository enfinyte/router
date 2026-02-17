"use client";

import { useState, useCallback, useMemo } from "react";
import { Crosshair, Check } from "lucide-react";
import { OnboardingHeader, OnboardingFooter } from "@/components/Onboarding";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PROVIDERS } from "@/lib/providers";
import { useGetModels } from "@/lib/api/models";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface ModelOption {
  provider: string;
  providerName: string;
  providerIcon: React.ReactNode;
  model: string;
  value: string; // "provider/model"
}

interface SetDefaultModelStepProps {
  onContinue: () => void;
  onBack: () => void;
}

export function SetDefaultModelStep({ onContinue, onBack }: SetDefaultModelStepProps) {
  const { data: modelsData, isLoading } = useGetModels();
  const [selected, setSelected] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const modelOptions = useMemo<ModelOption[]>(() => {
    if (!modelsData?.models) return [];

    const options: ModelOption[] = [];
    for (const [providerId, models] of Object.entries(modelsData.models)) {
      const providerConfig = PROVIDERS.find((p) => p.id === providerId);
      const providerName = providerConfig?.name ?? providerId;
      const providerIcon = providerConfig?.icon ?? null;

      for (const model of models) {
        options.push({
          provider: providerId,
          providerName,
          providerIcon,
          model,
          value: `${providerId}/${model}`,
        });
      }
    }
    return options;
  }, [modelsData]);

  const handleContinue = useCallback(async () => {
    if (!selected) return;

    try {
      setIsSaving(true);
      await authClient.updateUser({ fallbackProviderModelPair: selected });
      toast.success("Default model set", {
        description: "This will be used as your fallback when other models are unavailable.",
      });
      onContinue();
    } catch {
      toast.error("Failed to save default model", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }, [selected, onContinue]);

  // Group options by provider
  const groupedOptions = useMemo(() => {
    const groups: Record<string, ModelOption[]> = {};
    for (const option of modelOptions) {
      if (!groups[option.provider]) {
        groups[option.provider] = [];
      }
      groups[option.provider]!.push(option);
    }
    return groups;
  }, [modelOptions]);

  return (
    <>
      <OnboardingHeader
        icon={<Crosshair className="h-6 w-6 text-accent-foreground" />}
        title="Set your default model"
        description="Choose a default model and provider pair. This will be used as a fallback when no model is specified or when other models are unavailable."
      />

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </>
        ) : (
          <>
            {Object.entries(groupedOptions).map(([providerId, options]) => {
              const first = options[0];
              if (!first) return null;

              return (
                <div key={providerId} className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                    {first.providerIcon}
                    <span className="text-xs font-medium text-muted-foreground">
                      {first.providerName}
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      ({options.length} models)
                    </span>
                  </div>
                  <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                    {options.map((option) => {
                      const isSelected = selected === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelected(option.value)}
                          className={cn(
                            "flex w-full items-center justify-between px-4 py-3 text-left transition-colors cursor-pointer",
                            "hover:bg-accent/50",
                            isSelected && "bg-accent",
                          )}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{option.model}</span>
                            <code className="text-xs text-muted-foreground font-mono">
                              {option.value}
                            </code>
                          </div>
                          {isSelected && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground">
                              <Check className="h-3 w-3 text-background" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {modelOptions.length === 0 && (
              <div className="rounded-lg border border-border bg-card px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No models available. Please go back and connect at least one provider.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card px-5 py-4">
        <OnboardingFooter
          onBack={onBack}
          onContinue={handleContinue}
          continueDisabled={!selected || isSaving || isLoading}
          continueLabel={isSaving ? "Saving..." : "Continue"}
          hint="You can change this later in settings"
        />
      </div>
    </>
  );
}
