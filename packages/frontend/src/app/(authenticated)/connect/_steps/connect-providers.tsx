"use client";

import { useState, useCallback, useMemo } from "react";
import { ServerCogIcon } from "lucide-react";
import { OnboardingHeader, OnboardingFooter } from "@/components/Onboarding";
import { ProviderCard, ProviderCardSkeleton } from "@/components/ProviderCard";
import { toast } from "sonner";
import { PROVIDERS } from "@/lib/providers";
import { useAddSecret, useGetAllSecrets } from "@/lib/api/secrets";

const MASK = "••••••••••••••••";

type ProviderStatus = "idle" | "validating" | "connected" | "error";

interface ConnectProvidersStepProps {
  onContinue: () => void;
}

export function ConnectProvidersStep({ onContinue }: ConnectProvidersStepProps) {
  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});
  const [localStatuses, setLocalStatuses] = useState<Record<string, ProviderStatus>>({});
  const { mutateAsync: addSecret } = useAddSecret();
  const { data, isLoading } = useGetAllSecrets();

  const credentials = useMemo(() => {
    const result: Record<string, Record<string, string>> = {};
    for (const provider of PROVIDERS) {
      const saved = data?.providers?.[provider.id];
      const serverMasked: Record<string, string> = {};
      if (saved) {
        for (const fieldKey of saved.fields) {
          serverMasked[fieldKey] = MASK;
        }
      }
      result[provider.id] = { ...serverMasked, ...overrides[provider.id] };
    }
    return result;
  }, [data, overrides]);

  const statuses = useMemo(() => {
    const result: Record<string, ProviderStatus> = {};
    for (const provider of PROVIDERS) {
      if (localStatuses[provider.id]) {
        result[provider.id] = localStatuses[provider.id];
      } else if (data?.providers?.[provider.id]?.enabled) {
        result[provider.id] = "connected";
      } else {
        result[provider.id] = "idle";
      }
    }
    return result;
  }, [data, localStatuses]);

  const handleChange = useCallback((providerId: string, fieldKey: string, value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [fieldKey]: value,
      },
    }));
    setLocalStatuses((prev) => {
      if (prev[providerId] && prev[providerId] !== "idle") {
        return { ...prev, [providerId]: "idle" };
      }
      return prev;
    });
  }, []);

  const handleValidate = useCallback(
    async (providerId: string) => {
      try {
        setLocalStatuses((prev) => ({ ...prev, [providerId]: "validating" }));

        const providerCreds = credentials[providerId];
        const provider = PROVIDERS.find((p) => p.id === providerId);

        if (!provider || !providerCreds) {
          setLocalStatuses((prev) => ({ ...prev, [providerId]: "error" }));
          toast.error("Failed to save your Credentials", {
            description: "Please check your credentials and try again.",
          });
          return;
        }

        await addSecret({ provider: providerId, keys: providerCreds });

        setLocalStatuses((prev) => ({ ...prev, [providerId]: "connected" }));
        toast.success(`${provider.name} connected`, {
          description: "Your API key has been saved successfully.",
        });
      } catch {
        setLocalStatuses((prev) => ({ ...prev, [providerId]: "error" }));
        toast.error("Failed to save your Credentials", {
          description: "Please check your credentials and try again.",
        });
      }
    },
    [addSecret, credentials],
  );

  const connectedCount = useMemo(
    () => Object.values(statuses).filter((s) => s === "connected").length,
    [statuses],
  );

  return (
    <>
      <OnboardingHeader
        icon={<ServerCogIcon className="h-6 w-6 text-accent-foreground" />}
        title="Connect your AI providers"
        description="Add API keys for the providers you want to route requests through. You can always add or update these later."
      />

      <div className="flex flex-col gap-3">
        {isLoading
          ? PROVIDERS.map((p) => <ProviderCardSkeleton key={p.id} />)
          : PROVIDERS.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                values={credentials[provider.id] || {}}
                onChange={handleChange}
                status={statuses[provider.id] || "idle"}
                onValidate={handleValidate}
              />
            ))}
      </div>

      <div className="rounded-lg border border-border bg-card px-5 py-4">
        <OnboardingFooter
          onContinue={onContinue}
          continueDisabled={connectedCount === 0}
          hint="Keys are encrypted and stored securely"
          status={`${connectedCount} of ${PROVIDERS.length} providers connected`}
        />
      </div>
    </>
  );
}
