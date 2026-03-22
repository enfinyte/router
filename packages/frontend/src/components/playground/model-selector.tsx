"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useGetModels } from "@/lib/api/models";
import { PROVIDERS } from "@/lib/providers";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Compass, Zap, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const INTENTS = [
  "academia",
  "finance",
  "health",
  "legal",
  "marketing",
  "programming",
  "roleplay",
  "science",
  "seo",
  "technology",
  "translation",
  "trivia",
] as const;

const POLICIES = [
  { value: "auto", label: "Auto" },
  { value: "most-popular", label: "Most Popular" },
  { value: "pricing-low-to-high", label: "Cheapest First" },
  { value: "pricing-high-to-low", label: "Most Expensive First" },
  { value: "context-high-to-low", label: "Largest Context" },
  { value: "latency-low-to-high", label: "Lowest Latency" },
  { value: "throughput-high-to-low", label: "Highest Throughput" },
] as const;

type ModelMode = "direct" | "auto" | "intent";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const { data: modelsData, isLoading } = useGetModels();
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const mode = useMemo<ModelMode>(() => {
    if (value.startsWith("auto/")) return "auto";
    if (INTENTS.some((intent) => value.startsWith(`${intent}/`))) return "intent";
    return "direct";
  }, [value]);

  const [autoPolicy, setAutoPolicy] = useState(() => {
    if (value.startsWith("auto/")) {
      return value.slice(5) || "auto";
    }
    return "auto";
  });

  const [intent, setIntent] = useState(() => {
    for (const i of INTENTS) {
      if (value.startsWith(`${i}/`)) return i;
    }
    return "programming";
  });

  const [intentPolicy, setIntentPolicy] = useState(() => {
    for (const i of INTENTS) {
      if (value.startsWith(`${i}/`)) {
        return value.slice(i.length + 1) || "most-popular";
      }
    }
    return "most-popular";
  });

  const modelOptions = useMemo(() => {
    if (!modelsData?.models) return [];
    const options: { provider: string; providerName: string; model: string; value: string }[] = [];
    for (const [providerId, models] of Object.entries(modelsData.models)) {
      const providerConfig = PROVIDERS.find((p) => p.id === providerId);
      const providerName = providerConfig?.name ?? providerId;
      for (const model of models) {
        options.push({
          provider: providerId,
          providerName,
          model,
          value: `${providerId}/${model}`,
        });
      }
    }
    return options;
  }, [modelsData]);

  const groupedOptions = useMemo(() => {
    const groups: Record<string, typeof modelOptions> = {};
    for (const option of modelOptions) {
      if (!groups[option.provider]) {
        groups[option.provider] = [];
      }
      groups[option.provider]!.push(option);
    }
    return groups;
  }, [modelOptions]);

  const selectedModel = useMemo(
    () => modelOptions.find((o) => o.value === value),
    [modelOptions, value],
  );

  const handleModeChange = (newMode: string) => {
    const m = newMode as ModelMode;
    switch (m) {
      case "auto":
        onChange(`auto/${autoPolicy}`);
        break;
      case "intent":
        onChange(`${intent}/${intentPolicy}`);
        break;
      case "direct":
        if (modelOptions.length > 0 && !modelOptions.some((o) => o.value === value)) {
          onChange(modelOptions[0]!.value);
        }
        break;
    }
  };

  if (isLoading) {
    return <Skeleton className="h-9 w-[260px]" />;
  }

  return (
    <div className="flex items-center gap-2">
      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="h-8">
          <TabsTrigger value="direct" className="text-xs gap-1 px-2.5 cursor-pointer">
            <Zap className="h-3 w-3" />
            Direct
          </TabsTrigger>
          <TabsTrigger value="auto" className="text-xs gap-1 px-2.5 cursor-pointer">
            <Sparkles className="h-3 w-3" />
            Auto
          </TabsTrigger>
          <TabsTrigger value="intent" className="text-xs gap-1 px-2.5 cursor-pointer">
            <Compass className="h-3 w-3" />
            Intent
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "direct" && (
        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={comboboxOpen}
              className="w-full sm:w-[260px] h-8 justify-between text-xs font-normal cursor-pointer"
            >
              <span className="truncate">
                {selectedModel ? selectedModel.model : "Select a model..."}
              </span>
              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] sm:w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search models..." className="text-xs h-9" />
              <CommandList>
                <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                  No models found.
                </CommandEmpty>
                {Object.entries(groupedOptions).map(([providerId, options]) => {
                  const first = options[0];
                  if (!first) return null;
                  return (
                    <CommandGroup key={providerId} heading={first.providerName}>
                      {options.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          keywords={[option.model, option.providerName, option.provider]}
                          onSelect={(v) => {
                            onChange(v);
                            setComboboxOpen(false);
                          }}
                          className="text-xs cursor-pointer"
                        >
                          <span className="truncate">{option.model}</span>
                          <Check
                            className={cn(
                              "ml-auto h-3 w-3 shrink-0",
                              value === option.value ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
                {modelOptions.length === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No models available. Connect a provider first.
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {mode === "auto" && (
        <Select
          value={autoPolicy}
          onValueChange={(p) => {
            setAutoPolicy(p);
            onChange(`auto/${p}`);
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
            <SelectValue placeholder="Select policy" />
          </SelectTrigger>
          <SelectContent>
            {POLICIES.map((policy) => (
              <SelectItem
                key={policy.value}
                value={policy.value}
                className="text-xs"
              >
                {policy.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {mode === "intent" && (
        <>
          <Select
            value={intent}
            onValueChange={(i: string) => {
              setIntent(i as typeof intent);
              onChange(`${i}/${intentPolicy}`);
            }}
          >
            <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs">
              <SelectValue placeholder="Intent" />
            </SelectTrigger>
            <SelectContent>
              {INTENTS.map((i) => (
                <SelectItem key={i} value={i} className="text-xs capitalize">
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={intentPolicy}
            onValueChange={(p) => {
              setIntentPolicy(p);
              onChange(`${intent}/${p}`);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs">
              <SelectValue placeholder="Policy" />
            </SelectTrigger>
            <SelectContent>
              {POLICIES.filter((p) => p.value !== "auto").map((policy) => (
                <SelectItem
                  key={policy.value}
                  value={policy.value}
                  className="text-xs"
                >
                  {policy.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
}
