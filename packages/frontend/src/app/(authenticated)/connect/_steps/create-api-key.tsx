"use client";

import { useState, useCallback, useEffect } from "react";
import { KeyRound, Copy, Check, Loader2, Eye, EyeOff, Plus } from "lucide-react";
import { OnboardingHeader, OnboardingFooter } from "@/components/Onboarding";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useCreateApiKey, useListApiKeys } from "@/lib/api/api-keys";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type KeyStatus = "active" | "disabled" | "expired";

function getKeyStatus(key: { enabled: boolean; expiresAt: Date | null }): KeyStatus {
  if (key.expiresAt && new Date(key.expiresAt).getTime() < Date.now()) return "expired";
  return key.enabled ? "active" : "disabled";
}

const STATUS_BADGE_CLASSES: Record<KeyStatus, string> = {
  active: "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 shadow-none",
  disabled: "text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 shadow-none",
  expired: "text-red-600 bg-red-500/10 hover:bg-red-500/20 border-red-500/20 shadow-none",
};

const STATUS_LABELS: Record<KeyStatus, string> = {
  active: "Active",
  disabled: "Disabled",
  expired: "Expired",
};

interface CreateApiKeyStepProps {
  onBack: () => void;
}

export function CreateApiKeyStep({ onBack }: CreateApiKeyStepProps) {
  const router = useRouter();
  const { data: keys, isLoading: isLoadingKeys } = useListApiKeys();
  const hasKeys = keys && keys.length > 0;

  const [isCreating, setIsCreating] = useState(false);
  const [keyName, setKeyName] = useState("My First Key");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(true);
  const { mutateAsync: createKey, isPending } = useCreateApiKey();

  useEffect(() => {
    if (hasKeys) {
      setKeyName(`API Key ${keys.length + 1}`);
    } else {
      setKeyName("My First Key");
    }
  }, [hasKeys, keys?.length]);

  const handleGenerate = useCallback(async () => {
    if (!keyName.trim()) {
      toast.error("Please enter a name for your API key");
      return;
    }

    try {
      const result = await createKey({ name: keyName.trim() });

      setGeneratedKey(result.key);

      toast.success("API key created", {
        description: "Make sure to copy it — you won't be able to see it again.",
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

  const [isCompleting, setIsCompleting] = useState(false);

  const handleContinue = useCallback(async () => {
    try {
      setIsCompleting(true);
      await authClient.updateUser({ hasCompletedOnboarding: true });
      router.push("/");
    } catch {
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
      setIsCompleting(false);
    }
  }, [router]);

  const showList = !isLoadingKeys && hasKeys && !isCreating && !generatedKey;

  return (
    <>
      <OnboardingHeader
        icon={<KeyRound className="h-6 w-6 text-accent-foreground" />}
        title="Create your API key"
        description="Generate an API key to authenticate requests to the Enfinyte Router. Keep it safe — you'll need it to start routing."
      />

      <div className="flex flex-col gap-4">
        {isLoadingKeys ? (
          <div className="rounded-lg border border-border bg-card px-5 py-5 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
            <div className="flex justify-end">
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        ) : showList ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Existing Keys</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs hover:bg-background cursor-pointer"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create New
              </Button>
            </div>
            <div className="divide-y divide-border">
              {keys.map((key) => {
                const status = getKeyStatus(key);
                return (
                  <div key={key.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{key.name}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "px-1.5 py-0 text-[10px] font-medium h-4",
                            STATUS_BADGE_CLASSES[status],
                          )}
                        >
                          {STATUS_LABELS[status]}
                        </Badge>
                      </div>
                      <code className="text-xs font-mono text-muted-foreground">
                        {key.start ?? key.prefix ?? "\u2014"}...
                      </code>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
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
                <div className="flex items-center justify-end gap-2">
                  {hasKeys && (
                    <Button
                      variant="ghost"
                      onClick={() => setIsCreating(false)}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={handleGenerate}
                    disabled={isPending || !keyName.trim()}
                    className="gap-2 cursor-pointer"
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? "Generating..." : "Generate API Key"}
                  </Button>
                </div>
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
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={handleCopy}
                          className="gap-1 cursor-pointer"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <p className="rounded-md bg-accent/60 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                    Save this key somewhere safe. For security, it won&apos;t be shown again after
                    you leave this page.
                  </p>

                  {hasKeys && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGeneratedKey(null);
                        setIsCreating(false);
                      }}
                      className="self-end mt-2 cursor-pointer"
                    >
                      Done
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card px-5 py-4">
        <OnboardingFooter
          onBack={onBack}
          onContinue={handleContinue}
          continueDisabled={(!generatedKey && !hasKeys) || isCompleting}
          continueLabel={isCompleting ? "Setting up..." : "Go to Dashboard"}
          hint="Your key is encrypted and stored securely"
        />
      </div>
    </>
  );
}
