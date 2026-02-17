"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQueryState, parseAsInteger } from "nuqs";
import { OnboardingStepper } from "@/components/Onboarding";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectProvidersStep } from "./_steps/connect-providers";
import { SetDefaultModelStep } from "./_steps/set-default-model";
import { CreateApiKeyStep } from "./_steps/create-api-key";
import { useGetAllSecrets } from "@/lib/api/secrets";

const STEP_LABELS = ["Connect Providers", "Set Default Model", "Create API Key"];

export default function OnboardingPage() {
  const [step, setStep] = useQueryState(
    "step",
    parseAsInteger.withDefault(0).withOptions({ history: "push" }),
  );
  const { data, isLoading } = useGetAllSecrets();

  const hasConnectedProvider = useMemo(() => {
    if (!data?.providers) return false;
    return Object.values(data.providers).some((p) => p.enabled);
  }, [data]);

  useEffect(() => {
    if (!isLoading && step > 0 && !hasConnectedProvider) {
      setStep(0);
    }
  }, [step, isLoading, hasConnectedProvider, setStep]);

  const goToNext = useCallback(() => {
    setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1));
  }, [setStep]);

  const goToPrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, [setStep]);

  const safeStep = !isLoading && step > 0 && !hasConnectedProvider ? 0 : step;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
        <div className="flex flex-col gap-10">
          <OnboardingStepper
            currentStep={safeStep}
            totalSteps={STEP_LABELS.length}
            labels={STEP_LABELS}
          />

          {isLoading ? (
            <OnboardingLoadingSkeleton />
          ) : (
            <>
              {safeStep === 0 && <ConnectProvidersStep onContinue={goToNext} />}
              {safeStep === 1 && <SetDefaultModelStep onContinue={goToNext} onBack={goToPrev} />}
              {safeStep === 2 && <CreateApiKeyStep onBack={goToPrev} />}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function OnboardingLoadingSkeleton() {
  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[72px] w-full rounded-lg" />
        <Skeleton className="h-[72px] w-full rounded-lg" />
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
    </>
  );
}
