"use client";

import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useState, useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useListApiKeys } from "@/lib/api/api-keys";
import { cn } from "@/lib/utils";

interface ApiKeySelectorProps {
  value: string;
  onChange: (apiKey: string) => void;
}

export function ApiKeySelector({ value, onChange }: ApiKeySelectorProps) {
  const { data: keys } = useListApiKeys();
  const [showKey, setShowKey] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Sync inputValue when dialog opens
  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) setInputValue(value);
      setDialogOpen(open);
    },
    [value],
  );

  const activeKeys = useMemo(
    () =>
      (keys?.apiKeys ?? []).filter((k) => {
        if (!k.enabled) return false;
        if (k.expiresAt && new Date(k.expiresAt).getTime() < Date.now()) return false;
        return true;
      }),
    [keys?.apiKeys],
  );

  const handleSave = useCallback(() => {
    const sanitized = inputValue.trim().replace(/[^\x20-\x7E]/g, "");
    onChange(sanitized);
    setDialogOpen(false);
  }, [inputValue, onChange]);

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 text-xs font-normal cursor-pointer",
            !value && "text-muted-foreground",
          )}
        >
          <KeyRound className="h-3 w-3" />
          {value ? <code className="text-[11px]">{value.slice(0, 8)}...</code> : "Set API Key"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Key</DialogTitle>
          <DialogDescription>
            Enter your Enfinyte Router API key to authenticate playground requests.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.replace(/[^\x20-\x7E]/g, ""))}
                placeholder="enf_..."
                className="pr-10 text-xs font-mono h-9"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {activeKeys.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Your active keys (for reference):</p>
              <div className="space-y-1">
                {activeKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-xs"
                  >
                    <KeyRound className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-medium">{key.name ?? "Unnamed"}</span>
                    <code className="text-muted-foreground ml-auto">
                      {key.start ?? key.prefix ?? ""}...
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!inputValue.trim()}
            className="cursor-pointer"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
