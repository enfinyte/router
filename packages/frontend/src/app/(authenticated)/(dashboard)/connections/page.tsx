"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Power, PowerOff } from "lucide-react";
import { PROVIDERS } from "@/lib/providers";
import { useGetAllSecrets, useAddSecret, useToggleProvider } from "@/lib/api/secrets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MASK = "••••••••••••••••";

export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const { data: secretsData, isLoading: isLoadingSecrets } = useGetAllSecrets();
  const { mutate: addSecret, isPending: isAddingSecret } = useAddSecret();
  const { mutate: toggleProvider, isPending: isTogglingProvider } = useToggleProvider();

  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, Record<string, boolean>>>({});
  const [savingProviderId, setSavingProviderId] = useState<string | null>(null);

  const credentials = useMemo(() => {
    const result: Record<string, Record<string, string>> = {};
    for (const provider of PROVIDERS) {
      const saved = secretsData?.providers?.[provider.id];
      const serverMasked: Record<string, string> = {};
      if (saved) {
        for (const fieldKey of saved.fields) {
          serverMasked[fieldKey] = MASK;
        }
      }
      result[provider.id] = { ...serverMasked, ...formValues[provider.id] };
    }
    return result;
  }, [secretsData, formValues]);

  const handleInputChange = (providerId: string, fieldKey: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [fieldKey]: value,
      },
    }));
  };

  const toggleCardExpansion = (providerId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  const toggleSecretVisibility = (providerId: string, fieldKey: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [fieldKey]: !prev[providerId]?.[fieldKey],
      },
    }));
  };

  const handleSaveCredentials = (providerId: string) => {
    const values = formValues[providerId];
    if (!values) return;

    setSavingProviderId(providerId);
    addSecret(
      { provider: providerId, keys: values },
      {
        onSuccess: () => {
          toast.success("Credentials saved successfully");
          queryClient.invalidateQueries({ queryKey: ["fetch-secrets"] });
          setSavingProviderId(null);
          setFormValues((prev) => ({
            ...prev,
            [providerId]: {},
          }));
        },
        onError: () => {
          toast.error("Failed to save credentials");
          setSavingProviderId(null);
        },
      },
    );
  };

  const handleToggleProvider = (
    providerId: string,
    currentEnabled: boolean,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    toggleProvider(
      { provider: providerId, enabled: !currentEnabled },
      {
        onSuccess: (data) => {
          toast.success(data.enabled ? "Provider enabled" : "Provider disabled");
          queryClient.invalidateQueries({ queryKey: ["fetch-secrets"] });
        },
        onError: () => {
          toast.error("Failed to toggle provider");
        },
      },
    );
  };

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Manage Providers</h2>
            <p className="text-sm text-muted-foreground">
              Configure and manage your AI provider connections. Toggle providers on or off to
              control routing.
            </p>
          </div>

          <div className="grid gap-4">
            {isLoadingSecrets
              ? ["skel-1", "skel-2", "skel-3"].map((key) => (
                  <div key={key} className="rounded-lg border border-border bg-card">
                    <div className="flex w-full items-center gap-4 px-5 py-4">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <Skeleton className="h-4 w-28 mb-1.5" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                  </div>
                ))
              : PROVIDERS.map((provider) => {
                  const secretData = secretsData?.providers?.[provider.id];
                  const isConfigured = !!secretData && secretData.fields?.length > 0;
                  const isEnabled = secretData?.enabled ?? false;
                  const isExpanded = expandedCards[provider.id] ?? false;
                  const providerValues = credentials[provider.id] || {};
                  const hasLocalEdits = Object.keys(formValues[provider.id] || {}).length > 0;
                  const isSaving = savingProviderId === provider.id && isAddingSecret;

                  return (
                    <div
                      key={provider.id}
                      className={cn(
                        "group rounded-lg border border-border bg-card transition-all duration-200",
                        isExpanded && "border-muted-foreground/30",
                        isConfigured && isEnabled && "border-primary/20",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCardExpansion(provider.id)}
                        className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left focus:outline-none"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground">
                          {provider.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-medium text-foreground text-sm">
                              {provider.name}
                            </span>

                            {!isConfigured ? (
                              <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[10px] font-medium text-muted-foreground border-muted-foreground/30"
                              >
                                Not Connected
                              </Badge>
                            ) : isEnabled ? (
                              <Badge className="px-1.5 py-0 text-[10px] font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 shadow-none">
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[10px] font-medium text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20"
                              >
                                Disabled
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {provider.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
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

                          {isConfigured && (
                            <Button
                              size="sm"
                              variant={isEnabled ? "outline" : "default"}
                              className={cn(
                                "h-7 px-2 text-xs gap-1.5 transition-colors cursor-pointer",
                                isEnabled
                                  ? "text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                                  : "bg-green-200 hover:text-green-600 hover:bg-green-50",
                              )}
                              onClick={(e) => handleToggleProvider(provider.id, isEnabled, e)}
                              disabled={isTogglingProvider}
                            >
                              {isEnabled ? (
                                <>
                                  <PowerOff className="h-3.5 w-3.5" />
                                  <span className="sr-only sm:not-sr-only sm:inline-block">
                                    Disable
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Power className="h-3.5 w-3.5" />
                                  <span className="sr-only sm:not-sr-only sm:inline-block">
                                    Enable
                                  </span>
                                </>
                              )}
                            </Button>
                          )}

                          <div className="pl-1">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-5 pb-5 pt-4 animate-in slide-in-from-top-2 duration-200">
                          {!isConfigured && (
                            <div className="mb-4 rounded-md bg-accent/50 p-3 text-xs text-muted-foreground">
                              Set up credentials to start routing through {provider.name}.
                            </div>
                          )}

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
                                      field.type === "password" &&
                                      !showSecrets[provider.id]?.[field.key]
                                        ? "password"
                                        : "text"
                                    }
                                    name={field.label}
                                    placeholder={field.placeholder}
                                    value={providerValues[field.key] || field.defaultValue || ""}
                                    onChange={(e) =>
                                      handleInputChange(provider.id, field.key, e.target.value)
                                    }
                                    className="bg-background border-border pr-10 font-mono text-xs h-9 placeholder:font-sans"
                                  />
                                  {field.type === "password" && (
                                    <button
                                      type="button"
                                      onClick={() => toggleSecretVisibility(provider.id, field.key)}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                      aria-label={
                                        showSecrets[provider.id]?.[field.key]
                                          ? "Hide value"
                                          : "Show value"
                                      }
                                    >
                                      {showSecrets[provider.id]?.[field.key] ? (
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
                              onClick={() => handleSaveCredentials(provider.id)}
                              disabled={!hasLocalEdits || isSaving}
                              className="h-8 px-3 text-xs font-medium"
                            >
                              {isSaving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                              {isSaving ? "Saving..." : "Save Credentials"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </>
  );
}
