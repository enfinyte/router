"use client";

import { useState, useCallback } from "react";
import { KeyRound, Copy, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { OnboardingHeader, OnboardingFooter } from "@/components/Onboarding";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCreateApiKey } from "@/lib/api/api-keys";
import { useRouter } from "next/navigation";

interface CreateApiKeyStepProps {
  onBack: () => void;
}

export function CreateApiKeyStep({ onBack }: CreateApiKeyStepProps) {
  const router = useRouter();
  const [keyName, setKeyName] = useState("My First Key");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(true);
  const { mutateAsync: createKey, isPending } = useCreateApiKey();

  const handleGenerate = useCallback(async () => {
    if (!keyName.trim()) {
      toast.error("Please enter a name for your API key");
      return;
    }

    try {
      const result = await createKey({ name: keyName.trim() });

      setGeneratedKey(result.key);

      toast.success("API key created", {
        description: "Make sure to copy it now — you won't be able to see it again.",
      });
    } catch {
      toast.error("Failed to create API key", {
        description: "Something went wrong. Please try again.",
      });
    }
  }, [keyName, createKey]);

  const handleCopy = useCallback(async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [generatedKey]);

  const handleContinue = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <>
      <OnboardingHeader
        icon={<KeyRound className="h-6 w-6 text-accent-foreground" />}
        title="Create your API key"
        description="Generate an API key to authenticate requests to the Enfinyte Router. Keep it safe — you'll need it to start routing."
      />

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-card px-5 py-5">
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="key-name"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Key name
              </label>
              <Input
                id="key-name"
                type="text"
                placeholder="e.g. Production, Development, My App"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                disabled={generatedKey !== null}
                className="bg-background border-border text-sm h-9"
              />
            </div>

            {!generatedKey ? (
              <Button
                onClick={handleGenerate}
                disabled={isPending || !keyName.trim()}
                className="self-end gap-2 cursor-pointer"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Generating..." : "Generate API Key"}
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="generated-key"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Your API key
                  </label>
                  <div className="relative">
                    <Input
                      id="generated-key"
                      type={showKey ? "text" : "password"}
                      value={generatedKey}
                      readOnly
                      className="bg-background border-border pr-20 font-mono text-xs h-9"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowKey((prev) => !prev)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showKey ? "Hide key" : "Show key"}
                      >
                        {showKey ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <Button size="xs" variant="outline" onClick={handleCopy} className="gap-1">
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="rounded-md bg-accent/60 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                  Save this key somewhere safe. For security, it won&apos;t be shown again after you
                  leave this page.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card px-5 py-4">
        <OnboardingFooter
          onBack={onBack}
          onContinue={handleContinue}
          continueDisabled={!generatedKey}
          continueLabel="Go to Dashboard"
          hint="Your key is encrypted and stored securely"
        />
      </div>
    </>
  );
}
