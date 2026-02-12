import { ServerCogIcon } from "lucide-react";
import { ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OnboardingHeader() {
  return (
    <header className="text-center">
      <div className="mb-5 inline-flex items-center justify-center rounded-xl bg-accent p-3">
        <ServerCogIcon className="h-6 w-6 text-accent-foreground " />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl text-balance">
        Connect your AI providers
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
        Add API keys for the providers you want to route requests through. You can always add or
        update these later.
      </p>
    </header>
  );
}

interface OnboardingFooterProps {
  connectedCount: number;
  totalCount: number;
  onContinue: () => void;
}

export function OnboardingFooter({
  connectedCount,
  totalCount,
  onContinue,
}: OnboardingFooterProps) {
  "use client";
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" />
        <span>Keys are encrypted and stored securely</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground">
          {connectedCount} of {totalCount} providers connected
        </span>
        <Button onClick={onContinue} disabled={connectedCount === 0} className="gap-2">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
