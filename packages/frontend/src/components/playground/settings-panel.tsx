"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlaygroundSettings } from "@/lib/api/playground";
import { Settings2 } from "lucide-react";

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

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const update = (partial: Partial<PlaygroundSettings>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="instructions" className="text-xs text-muted-foreground">
            System Instructions
          </Label>
          <textarea
            id="instructions"
            value={settings.instructions ?? ""}
            onChange={(e) => update({ instructions: e.target.value || undefined })}
            placeholder="You are a helpful assistant..."
            rows={4}
            className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs resize-none outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/20 transition-all placeholder:text-muted-foreground"
          />
        </div>

        <SliderRow
          label="Temperature"
          value={settings.temperature}
          onChange={(v) => update({ temperature: v })}
          min={0}
          max={2}
          step={0.1}
          defaultValue={1}
        />

        <SliderRow
          label="Top P"
          value={settings.top_p}
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
            value={settings.max_output_tokens ?? ""}
            onChange={(e) => {
              const v = e.target.value ? parseInt(e.target.value, 10) : null;
              update({ max_output_tokens: v });
            }}
            placeholder="Default"
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Reasoning Effort
          </Label>
          <Select
            value={settings.reasoning_effort ?? "none"}
            onValueChange={(v) => {
              const val = v as PlaygroundSettings["reasoning_effort"];
              update({ reasoning_effort: val === "none" ? null : val });
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                None (default)
              </SelectItem>
              <SelectItem value="low" className="text-xs">
                Low
              </SelectItem>
              <SelectItem value="medium" className="text-xs">
                Medium
              </SelectItem>
              <SelectItem value="high" className="text-xs">
                High
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SliderRow
          label="Presence Penalty"
          value={settings.presence_penalty}
          onChange={(v) => update({ presence_penalty: v })}
          min={-2}
          max={2}
          step={0.1}
          defaultValue={0}
        />

        <SliderRow
          label="Frequency Penalty"
          value={settings.frequency_penalty}
          onChange={(v) => update({ frequency_penalty: v })}
          min={-2}
          max={2}
          step={0.1}
          defaultValue={0}
        />
      </div>
    </div>
  );
}
