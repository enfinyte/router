"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelSearchCombobox } from "@/components/model-search-combobox";
import type { PlaygroundSettings } from "@/lib/api/playground";
import { Button } from "@/components/ui/button";
import { Settings2, RotateCcw, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGetUser } from "@/lib/api/user";
import { useGetModels } from "@/lib/api/models";
import { authClient } from "@/lib/auth-client";

interface SettingsPanelProps {
  settings: PlaygroundSettings;
  onChange: (settings: PlaygroundSettings) => void;
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  defaultValue,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}) {
  const displayValue = value ?? defaultValue;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {displayValue.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(v === defaultValue ? null : v);
        }}
        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
}

const ANALYSIS_TARGET_OPTIONS = [
  { value: "per_prompt", label: "Per message" },
  { value: "per_system_prompt", label: "Per system prompt" },
] as const;

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const queryClient = useQueryClient();
  const { data: user } = useGetUser();
  const { data: modelsData } = useGetModels();

  const [draft, setDraft] = useState<PlaygroundSettings>(settings);
  const [isSavingRouter, setIsSavingRouter] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [routerOpen, setRouterOpen] = useState(false);
  const [draftFallback, setDraftFallback] = useState<string | null>(null);
  const [draftAnalysisTarget, setDraftAnalysisTarget] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    setDraftFallback(user?.fallbackProviderModelPair ?? null);
    setDraftAnalysisTarget(user?.analysisTarget ?? "per_prompt");
  }, [user?.fallbackProviderModelPair, user?.analysisTarget]);

  const update = (partial: Partial<PlaygroundSettings>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const isRouterDirty =
    draftFallback !== (user?.fallbackProviderModelPair ?? null) ||
    draftAnalysisTarget !== (user?.analysisTarget ?? "per_prompt");

  const handleApplyRouterConfig = useCallback(async () => {
    const updates: Record<string, string> = {};
    if (draftFallback && draftFallback !== (user?.fallbackProviderModelPair ?? null)) {
      updates.fallbackProviderModelPair = draftFallback;
    }
    if (draftAnalysisTarget && draftAnalysisTarget !== (user?.analysisTarget ?? "per_prompt")) {
      updates.analysisTarget = draftAnalysisTarget;
    }
    if (Object.keys(updates).length === 0) return;
    try {
      setIsSavingRouter(true);
      await authClient.updateUser(updates);
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Router config updated");
    } catch {
      toast.error("Failed to update router config");
    } finally {
      setIsSavingRouter(false);
    }
  }, [draftFallback, draftAnalysisTarget, user, queryClient]);

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background shrink-0">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Settings</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer"
            title="Reset to defaults"
            onClick={() => {
              setDraft({});
              onChange({});
              toast.success("Settings reset to defaults");
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Generation Settings */}
        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => setGenerationOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Generation</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", generationOpen && "rotate-180")} />
          </button>

          <div className={cn("grid transition-[grid-template-rows] duration-200 ease-in-out", generationOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
            <div className="overflow-hidden">
              <div className="px-4 pb-4 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="instructions" className="text-xs text-muted-foreground">
                    System Instructions
                  </Label>
                  <textarea
                    id="instructions"
                    value={draft.instructions ?? ""}
                    onChange={(e) => update({ instructions: e.target.value || undefined })}
                    placeholder="You are a helpful assistant..."
                    rows={4}
                    className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs resize-none outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/20 transition-all placeholder:text-muted-foreground"
                  />
                </div>

                <SliderRow
                  label="Temperature"
                  value={draft.temperature}
                  onChange={(v) => update({ temperature: v })}
                  min={0}
                  max={2}
                  step={0.1}
                  defaultValue={1}
                />

                <SliderRow
                  label="Top P"
                  value={draft.top_p}
                  onChange={(v) => update({ top_p: v })}
                  min={0}
                  max={1}
                  step={0.05}
                  defaultValue={1}
                />

                <div className="space-y-2">
                  <Label htmlFor="max-tokens" className="text-xs text-muted-foreground">
                    Max Output Tokens
                  </Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    min={1}
                    max={128000}
                    value={draft.max_output_tokens ?? ""}
                    onChange={(e) => {
                      const v = e.target.value ? parseInt(e.target.value, 10) : null;
                      update({ max_output_tokens: v });
                    }}
                    placeholder="Default"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Reasoning Effort</Label>
                  <Select
                    value={draft.reasoning_effort ?? "none"}
                    onValueChange={(v) => {
                      const val = v as PlaygroundSettings["reasoning_effort"];
                      update({ reasoning_effort: val === "none" ? null : val });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None (default)</SelectItem>
                      <SelectItem value="low" className="text-xs">Low</SelectItem>
                      <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                      <SelectItem value="high" className="text-xs">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <SliderRow
                  label="Presence Penalty"
                  value={draft.presence_penalty}
                  onChange={(v) => update({ presence_penalty: v })}
                  min={-2}
                  max={2}
                  step={0.1}
                  defaultValue={0}
                />

                <SliderRow
                  label="Frequency Penalty"
                  value={draft.frequency_penalty}
                  onChange={(v) => update({ frequency_penalty: v })}
                  min={-2}
                  max={2}
                  step={0.1}
                  defaultValue={0}
                />

                <Button
                  size="sm"
                  className="w-full cursor-pointer"
                  disabled={!isDirty}
                  onClick={() => {
                    onChange(draft);
                    toast.success("Generation settings applied");
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Router Config */}
        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => setRouterOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Router Config</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", routerOpen && "rotate-180")} />
          </button>

          <div className={cn("grid transition-[grid-template-rows] duration-200 ease-in-out", routerOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
            <div className="overflow-hidden">
              <div className="px-4 pb-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Default Model</Label>
                  <ModelSearchCombobox
                    models={modelsData?.models}
                    value={draftFallback}
                    onChange={setDraftFallback}
                    disabled={isSavingRouter}
                    placeholder="Select model..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Analysis Target</Label>
                  <Select
                    value={draftAnalysisTarget ?? "per_prompt"}
                    onValueChange={setDraftAnalysisTarget}
                    disabled={isSavingRouter}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANALYSIS_TARGET_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  size="sm"
                  className="w-full cursor-pointer"
                  disabled={!isRouterDirty || isSavingRouter}
                  onClick={handleApplyRouterConfig}
                >
                  {isSavingRouter && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
