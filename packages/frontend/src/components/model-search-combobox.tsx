"use client";

import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";

interface ModelOption {
  provider: string;
  providerName: string;
  model: string;
  value: string;
}

interface ModelSearchComboboxProps {
  models: Record<string, string[]> | undefined;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ModelSearchCombobox({
  models,
  value,
  onChange,
  disabled,
  placeholder = "Select model...",
  className,
}: ModelSearchComboboxProps) {
  const [open, setOpen] = useState(false);

  const modelOptions = useMemo<ModelOption[]>(() => {
    if (!models) return [];
    const options: ModelOption[] = [];
    for (const [providerId, modelList] of Object.entries(models)) {
      const provider = PROVIDERS.find((p) => p.id === providerId);
      const providerName = provider?.name ?? providerId;
      for (const model of modelList) {
        options.push({
          provider: providerId,
          providerName,
          model,
          value: `${providerId}/${model}`,
        });
      }
    }
    return options;
  }, [models]);

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

  const selected = useMemo(
    () => modelOptions.find((o) => o.value === value),
    [modelOptions, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full h-8 justify-between text-xs font-normal cursor-pointer", className)}
        >
          <span className="truncate">
            {selected ? selected.model : placeholder}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
                        setOpen(false);
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
  );
}
