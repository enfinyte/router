"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useGetUser } from "@/lib/api/user";
import { useGetModels } from "@/lib/api/models";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Crosshair, Check, Pencil, ScanSearch, Search } from "lucide-react";
import { PROVIDERS } from "@/lib/providers";
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

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading } = useGetUser();
  const { data: modelsData, isLoading: isModelsLoading } = useGetModels();

  const [isEditingFallback, setIsEditingFallback] = useState(false);
  const [selectedFallback, setSelectedFallback] = useState<string | null>(null);
  const [isSavingFallback, setIsSavingFallback] = useState(false);

  const [fallbackSearch, setFallbackSearch] = useState("");

  const [isEditingAnalysisTarget, setIsEditingAnalysisTarget] = useState(false);
  const [selectedAnalysisTarget, setSelectedAnalysisTarget] = useState<string | null>(null);
  const [isSavingAnalysisTarget, setIsSavingAnalysisTarget] = useState(false);

  const currentFallbackDisplay = useMemo(() => {
    const pair = user?.fallbackProviderModelPair;
    if (!pair) return null;
    const slashIndex = pair.indexOf("/");
    if (slashIndex === -1) return { provider: pair, model: pair };
    const providerId = pair.slice(0, slashIndex);
    const model = pair.slice(slashIndex + 1);
    const provider = PROVIDERS.find((p) => p.id === providerId);
    return { provider: provider?.name ?? providerId, model, value: pair, icon: provider?.icon };
  }, [user?.fallbackProviderModelPair]);

  const fallbackModelOptions = useMemo(() => {
    if (!modelsData?.models) return [];
    const options: { provider: string; providerName: string; providerIcon: React.ReactNode; model: string; value: string }[] = [];
    for (const [providerId, models] of Object.entries(modelsData.models)) {
      const providerConfig = PROVIDERS.find((p) => p.id === providerId);
      for (const model of models) {
        options.push({
          provider: providerId,
          providerName: providerConfig?.name ?? providerId,
          providerIcon: providerConfig?.icon ?? null,
          model,
          value: `${providerId}/${model}`,
        });
      }
    }
    return options;
  }, [modelsData]);

  const filteredFallbackOptions = useMemo(() => {
    if (!fallbackSearch.trim()) return fallbackModelOptions;
    const q = fallbackSearch.toLowerCase();
    return fallbackModelOptions.filter(
      (o) =>
        o.model.toLowerCase().includes(q) ||
        o.providerName.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [fallbackModelOptions, fallbackSearch]);

  const fallbackGroupedOptions = useMemo(() => {
    const groups: Record<string, typeof fallbackModelOptions> = {};
    for (const option of filteredFallbackOptions) {
      if (!groups[option.provider]) {
        groups[option.provider] = [];
      }
      groups[option.provider]!.push(option);
    }
    return groups;
  }, [filteredFallbackOptions]);

  const handleSaveFallback = useCallback(async () => {
    if (!selectedFallback) return;
    try {
      setIsSavingFallback(true);
      await authClient.updateUser({ fallbackProviderModelPair: selectedFallback });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Default model updated");
      setIsEditingFallback(false);
      setSelectedFallback(null);
    } catch {
      toast.error("Failed to update default model");
    } finally {
      setIsSavingFallback(false);
    }
  }, [selectedFallback, queryClient]);

  const currentAnalysisTarget = useMemo(() => {
    const value = user?.analysisTarget ?? "per_prompt";
    return ANALYSIS_TARGET_OPTIONS.find((o) => o.value === value) ?? ANALYSIS_TARGET_OPTIONS[0];
  }, [user?.analysisTarget]);

  const handleSaveAnalysisTarget = useCallback(async () => {
    if (!selectedAnalysisTarget) return;
    try {
      setIsSavingAnalysisTarget(true);
      await authClient.updateUser({ analysisTarget: selectedAnalysisTarget });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Analysis target updated");
      setIsEditingAnalysisTarget(false);
      setSelectedAnalysisTarget(null);
    } catch {
      toast.error("Failed to update analysis target");
    } finally {
      setIsSavingAnalysisTarget(false);
    }
  }, [selectedAnalysisTarget, queryClient]);

  const isLoading = isUserLoading || isModelsLoading;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-tight">Default Model</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Your fallback model used when no model is specified or when other models are
              unavailable.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : !isEditingFallback ? (
              <div className="flex items-center justify-between">
                {currentFallbackDisplay ? (
                  <div className="flex items-center gap-3">
                    {currentFallbackDisplay.icon}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">
                        {currentFallbackDisplay.model}
                      </span>
                      <code className="text-xs text-muted-foreground font-mono">
                        {currentFallbackDisplay.value}
                      </code>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No default model set</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFallback(user?.fallbackProviderModelPair ?? null);
                    setIsEditingFallback(true);
                  }}
                  className="gap-1.5 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={fallbackSearch}
                    onChange={(e) => setFallbackSearch(e.target.value)}
                    placeholder="Search models..."
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring/50 focus:ring-1 focus:ring-ring/20 transition-all"
                  />
                </div>

                {Object.entries(fallbackGroupedOptions).map(([providerId, options]) => {
                  const first = options[0];
                  if (!first) return null;
                  return (
                    <div
                      key={providerId}
                      className="rounded-lg border border-border overflow-hidden"
                    >
                      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                        {first.providerIcon}
                        <span className="text-xs font-medium text-muted-foreground">
                          {first.providerName}
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          ({options.length} models)
                        </span>
                      </div>
                      <div className="divide-y divide-border max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                        {options.map((option) => {
                          const isSelected = selectedFallback === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setSelectedFallback(option.value)}
                              className={cn(
                                "flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer",
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

                {fallbackModelOptions.length > 0 && filteredFallbackOptions.length === 0 && (
                  <div className="rounded-lg border border-border px-5 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No models match &ldquo;{fallbackSearch}&rdquo;
                    </p>
                  </div>
                )}

                {fallbackModelOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No connected providers available. Connect a provider first.
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingFallback(false);
                      setSelectedFallback(null);
                      setFallbackSearch("");
                    }}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveFallback}
                    disabled={!selectedFallback || isSavingFallback}
                    className="cursor-pointer"
                  >
                    {isSavingFallback && (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-tight">Analysis Target</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Controls how the router classifies requests when using auto-routing mode.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : !isEditingAnalysisTarget ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{currentAnalysisTarget.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {currentAnalysisTarget.description}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAnalysisTarget(user?.analysisTarget ?? "per_prompt");
                    setIsEditingAnalysisTarget(true);
                  }}
                  className="gap-1.5 cursor-pointer shrink-0 self-start"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {ANALYSIS_TARGET_OPTIONS.map((option) => {
                  const isSelected = selectedAnalysisTarget === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedAnalysisTarget(option.value)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer",
                        "hover:bg-accent/50",
                        isSelected
                          ? "border-foreground/30 bg-accent"
                          : "border-border",
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground ml-3">
                          <Check className="h-3 w-3 text-background" />
                        </div>
                      )}
                    </button>
                  );
                })}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingAnalysisTarget(false);
                      setSelectedAnalysisTarget(null);
                    }}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAnalysisTarget}
                    disabled={!selectedAnalysisTarget || isSavingAnalysisTarget}
                    className="cursor-pointer"
                  >
                    {isSavingAnalysisTarget && (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
