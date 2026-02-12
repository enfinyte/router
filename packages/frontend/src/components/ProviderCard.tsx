"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  models: string[];
  fields: {
    key: string;
    label: string;
    placeholder: string;
    type: "text" | "password";
    defaultValue?: string;
  }[];
  docsUrl: string;
}

interface ProviderCardProps {
  provider: ProviderConfig;
  values: Record<string, string>;
  onChange: (providerId: string, fieldKey: string, value: string) => void;
  status: "idle" | "validating" | "connected" | "error";
  onValidate: (providerId: string) => void;
}

export function ProviderCard({
  provider,
  values,
  onChange,
  status,
  onValidate,
}: ProviderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const hasValues = useMemo(
    () => provider.fields.some((f) => values[f.key]?.trim()),
    [provider.fields, values],
  );

  const toggleSecret = useCallback((key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div
      className={cn(
        "group rounded-lg border border-border bg-card transition-all duration-200",
        expanded && "border-muted-foreground/30",
        status === "connected" && "border-success/40",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground">
          {provider.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-foreground text-sm">{provider.name}</span>
            {status === "connected" && (
              <Badge className="px-1.5 py-0 text-[10px] font-medium">Connected</Badge>
            )}
            {status === "error" && (
              <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-medium">
                Invalid
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{provider.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            {provider.models.slice(0, 3).map((model) => (
              <span
                key={model}
                className="inline-block rounded bg-accent px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
              >
                {model}
              </span>
            ))}
            {provider.models.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{provider.models.length - 3}
              </span>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <div className="flex flex-col gap-3">
            {provider.fields.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`${provider.id}-${field.key}`}
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  {field.label}
                </label>
                <div className="relative">
                  <Input
                    id={`${provider.id}-${field.key}`}
                    type={
                      field.type === "password" && !showSecrets[field.key] ? "password" : "text"
                    }
                    name={field.label}
                    placeholder={field.placeholder}
                    value={values[field.key] || field.defaultValue || ""}
                    onChange={(e) => onChange(provider.id, field.key, e.target.value)}
                    className="bg-background border-border pr-10 font-mono text-xs h-9 placeholder:font-sans"
                  />
                  {field.type === "password" && (
                    <button
                      type="button"
                      onClick={() => toggleSecret(field.key)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showSecrets[field.key] ? "Hide value" : "Show value"}
                    >
                      {showSecrets[field.key] ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Get API key
            </a>
            <Button
              size="sm"
              onClick={() => onValidate(provider.id)}
              disabled={!hasValues || status === "validating"}
              className={cn("h-8 px-3 text-xs font-medium", status === "connected" && " border")}
              variant={status === "connected" ? "outline" : "default"}
            >
              {status === "validating" && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              {status === "connected" && <Check className="mr-1.5 h-3 w-3" />}
              {status === "validating"
                ? "Validating..."
                : status === "connected"
                  ? "Connected"
                  : "Save Key"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
