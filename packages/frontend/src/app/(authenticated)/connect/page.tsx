"use client";

import { useState, useCallback, useMemo } from "react";
import { OnboardingFooter, OnboardingHeader } from "@/components/Onboarding";
import { ProviderCard } from "@/components/ProviderCard";
import { toast } from "sonner";
import { PROVIDERS } from "@/lib/providers";

type ProviderStatus = "idle" | "validating" | "connected" | "error";

export default function OnboardingPage() {
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>({});
  const [statuses, setStatuses] = useState<Record<string, ProviderStatus>>({});

  const handleChange = useCallback((providerId: string, fieldKey: string, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [fieldKey]: value,
      },
    }));
    setStatuses((prev) => {
      if (prev[providerId] && prev[providerId] !== "idle") {
        return { ...prev, [providerId]: "idle" };
      }
      return prev;
    });
  }, []);

  const handleValidate = useCallback(
    async (providerId: string) => {
      setStatuses((prev) => ({ ...prev, [providerId]: "validating" }));

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const providerCreds = credentials[providerId];
      const provider = PROVIDERS.find((p) => p.id === providerId);

      if (!provider || !providerCreds) {
        setStatuses((prev) => ({ ...prev, [providerId]: "error" }));
        toast.error("Validation failed", {
          description: "Please check your credentials and try again.",
        });
        return;
      }

      const primaryField = provider.fields[0];
      if (providerCreds[primaryField.key]?.trim().length > 3) {
        setStatuses((prev) => ({ ...prev, [providerId]: "connected" }));
        toast.success(`${provider.name} connected`, {
          description: "Your API key has been saved successfully.",
        });
      } else {
        setStatuses((prev) => ({ ...prev, [providerId]: "error" }));
        toast.error("Invalid API key", {
          description: "The key provided does not appear to be valid.",
        });
      }
    },
    [credentials],
  );

  const handleContinue = useCallback(() => {
    const connected = Object.values(statuses).filter((s) => s === "connected").length;
    toast.success("Setup complete!", {
      description: `${connected} provider${connected > 1 ? "s" : ""} configured. Redirecting to dashboard...`,
    });
  }, [statuses]);

  const connectedCount = useMemo(
    () => Object.values(statuses).filter((s) => s === "connected").length,
    [statuses],
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
        <div className="flex flex-col gap-10">
          <OnboardingHeader />

          <div className="flex flex-col gap-3">
            {PROVIDERS.map((provider) => (
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
              connectedCount={connectedCount}
              totalCount={PROVIDERS.length}
              onContinue={handleContinue}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
