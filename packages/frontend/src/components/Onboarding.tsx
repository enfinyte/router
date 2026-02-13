import { ArrowLeft, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function OnboardingHeader({ icon, title, description }: OnboardingHeaderProps) {
  return (
    <header className="text-center">
      <div className="mb-5 inline-flex items-center justify-center rounded-xl bg-accent p-3">
        {icon}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl text-balance">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
        {description}
      </p>
    </header>
  );
}

interface OnboardingFooterProps {
  onContinue: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  onBack?: () => void;
  hint?: React.ReactNode;
  status?: React.ReactNode;
}

export function OnboardingFooter({
  onContinue,
  continueDisabled,
  continueLabel = "Continue",
  onBack,
  hint,
  status,
}: OnboardingFooterProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {hint ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>{hint}</span>
        </div>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-3">
        {status && <span className="text-xs text-muted-foreground">{status}</span>}
        {onBack && (
          <Button variant="outline" onClick={onBack} className="gap-2 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        <Button onClick={onContinue} disabled={continueDisabled} className="gap-2 cursor-pointer">
          {continueLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface OnboardingStepperProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function OnboardingStepper({ currentStep, totalSteps, labels }: OnboardingStepperProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                i < currentStep
                  ? "bg-primary text-primary-foreground"
                  : i === currentStep
                    ? "bg-foreground text-background"
                    : "bg-accent text-muted-foreground",
              )}
            >
              {i < currentStep ? (
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3 w-3"
                >
                  <path d="M2 6l3 3 5-5" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                "hidden text-xs sm:block",
                i === currentStep ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {labels[i]}
            </span>
          </div>
          {i < totalSteps - 1 && (
            <div className={cn("h-px w-8 sm:w-12", i < currentStep ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}
