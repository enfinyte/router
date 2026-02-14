"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useListApiKeys,
  useCreateApiKey,
  useUpdateApiKey,
  useDeleteApiKey,
} from "@/lib/api/api-keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow, hoursToSeconds } from "date-fns";

const EXPIRATION_OPTIONS = [
  { label: "Never", value: "never" },
  { label: "7 days", value: "7" },
  { label: "14 days", value: "14" },
  { label: "30 days", value: "30" },
  { label: "60 days", value: "60" },
] as const;

function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "\u2014";
  }
}

function formatExpiry(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (d.getTime() < Date.now()) return "Expired";
    return formatDistanceToNow(d, { addSuffix: false });
  } catch {
    return "\u2014";
  }
}

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

export default function ApiKeysPage() {
  const { data: keys, isLoading } = useListApiKeys();
  const createApiKey = useCreateApiKey();
  const updateApiKey = useUpdateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [expiresIn, setExpiresIn] = useState("never");
  const [createdKeyValue, setCreatedKeyValue] = useState<string | null>(null);
  const [showCreatedKey, setShowCreatedKey] = useState(true);
  const [copied, setCopied] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string | null;
  } | null>(null);

  const sortedKeys = useMemo(() => {
    if (!keys) return [];
    return [...keys].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [keys]);

  const resetCreateDialog = useCallback(() => {
    setKeyName("");
    setExpiresIn("never");
    setCreatedKeyValue(null);
    setShowCreatedKey(true);
    setCopied(false);
  }, []);

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetCreateDialog();
      setIsCreateOpen(open);
    },
    [resetCreateDialog],
  );

  const handleCreate = useCallback(async () => {
    if (!keyName.trim()) {
      toast.error("Please enter a name for your API key");
      return;
    }

    try {
      const result = await createApiKey.mutateAsync({
        name: keyName.trim(),
        expiresIn:
          expiresIn === "never" ? null : hoursToSeconds(24 * Number.parseInt(expiresIn, 10)),
      });

      setCreatedKeyValue(result.key);
      toast.success("API key created", {
        description: "Make sure to copy it \u2014 you won\u2019t see it again.",
      });
    } catch {
      toast.error("Failed to create API key");
    }
  }, [keyName, expiresIn, createApiKey]);

  const handleCopyKey = useCallback(async () => {
    if (!createdKeyValue) return;
    try {
      await navigator.clipboard.writeText(createdKeyValue);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [createdKeyValue]);

  const handleToggle = useCallback(
    async (keyId: string, currentlyEnabled: boolean) => {
      try {
        await updateApiKey.mutateAsync({ keyId, enabled: !currentlyEnabled });
        toast.success(currentlyEnabled ? "API key disabled" : "API key enabled");
      } catch {
        toast.error("Failed to update API key");
      }
    },
    [updateApiKey],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteApiKey.mutateAsync({ keyId: deleteTarget.id });
      toast.success("API key deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete API key");
    }
  }, [deleteTarget, deleteApiKey]);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Manage API Keys</h2>
              <p className="text-sm text-muted-foreground">
                Create and manage API keys to authenticate requests to the Enfinyte Router.
              </p>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
              <DialogTrigger asChild>
                <Button className="gap-2 cursor-pointer self-start">
                  <Plus className="h-4 w-4" />
                  Create API Key
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {createdKeyValue ? "API Key Created" : "Create API Key"}
                  </DialogTitle>
                  <DialogDescription>
                    {createdKeyValue
                      ? "Your new API key has been generated."
                      : "Generate a new API key for your applications."}
                  </DialogDescription>
                </DialogHeader>

                {!createdKeyValue ? (
                  <div className="flex flex-col gap-4 py-2">
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor="key-name"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Key name
                      </Label>
                      <Input
                        id="key-name"
                        placeholder="e.g. Production, Development, My App"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        className="bg-background border-border text-sm h-9"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor="key-expiry"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Expiration
                      </Label>
                      <Select value={expiresIn} onValueChange={setExpiresIn}>
                        <SelectTrigger id="key-expiry" className="w-full h-9 text-sm">
                          <SelectValue placeholder="Select expiration" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPIRATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 py-2">
                    <div className="rounded-lg border border-border bg-card px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Your API Key
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setShowCreatedKey((prev) => !prev)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            aria-label={showCreatedKey ? "Hide key" : "Show key"}
                          >
                            {showCreatedKey ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopyKey}
                            className="gap-1 h-7 px-2 text-xs cursor-pointer"
                          >
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copied ? "Copied" : "Copy"}
                          </Button>
                        </div>
                      </div>
                      <code className="block w-full rounded bg-muted/50 px-3 py-2 font-mono text-xs break-all border border-border">
                        {showCreatedKey
                          ? createdKeyValue
                          : "\u2022".repeat(Math.min(createdKeyValue.length, 48))}
                      </code>
                    </div>

                    <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-600 leading-relaxed">
                        Save this key somewhere safe. For security, it won&apos;t be shown again
                        after you close this dialog.
                      </p>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  {!createdKeyValue ? (
                    <Button
                      onClick={handleCreate}
                      disabled={createApiKey.isPending || !keyName.trim()}
                      className="gap-2 cursor-pointer"
                    >
                      {createApiKey.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {createApiKey.isPending ? "Generating..." : "Generate API Key"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        resetCreateDialog();
                        setIsCreateOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      Done
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-lg border border-border bg-card">
            {isLoading ? (
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 w-[25%]">Name</TableHead>
                    <TableHead className="w-[15%]">Key Preview</TableHead>
                    <TableHead className="w-[10%]">Status</TableHead>
                    <TableHead className="w-[14%]">Created</TableHead>
                    <TableHead className="w-[14%]">Last Used</TableHead>
                    <TableHead className="w-[10%]">Expires</TableHead>
                    <TableHead className="text-right pr-4 w-[12%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2.5">
                          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24 rounded" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : sortedKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                  <KeyRound className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold">No API keys yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-1.5 mb-6">
                  Create an API key to authenticate requests to the Enfinyte Router.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Create API Key
                </Button>
              </div>
            ) : (
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 w-[25%]">Name</TableHead>
                    <TableHead className="w-[15%]">Key Preview</TableHead>
                    <TableHead className="w-[10%]">Status</TableHead>
                    <TableHead className="w-[14%]">Created</TableHead>
                    <TableHead className="w-[14%]">Last Used</TableHead>
                    <TableHead className="w-[10%]">Expires</TableHead>
                    <TableHead className="text-right pr-4 w-[12%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedKeys.map((apiKey) => {
                    const status = getKeyStatus(apiKey);
                    return (
                      <TableRow key={apiKey.id}>
                        <TableCell className="pl-4 font-medium">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-foreground">
                              <KeyRound className="h-4 w-4" />
                            </div>
                            <span className="text-sm">{apiKey.name ?? "Unnamed"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                            {apiKey.start ?? apiKey.prefix ?? "\u2014"}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "px-1.5 py-0 text-[10px] font-medium",
                              STATUS_BADGE_CLASSES[status],
                            )}
                          >
                            {STATUS_LABELS[status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatRelative(apiKey.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatRelative(apiKey.lastRequest)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatExpiry(apiKey.expiresAt)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 cursor-pointer transition-colors",
                                apiKey.enabled
                                  ? "text-green-600 hover:text-amber-600 hover:bg-amber-500/10"
                                  : "text-amber-600 hover:text-green-600 hover:bg-green-500/10",
                              )}
                              onClick={() => handleToggle(apiKey.id, apiKey.enabled)}
                              disabled={updateApiKey.isPending}
                              title={apiKey.enabled ? "Disable key" : "Enable key"}
                            >
                              {apiKey.enabled ? (
                                <Power className="h-4 w-4" />
                              ) : (
                                <PowerOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => setDeleteTarget({ id: apiKey.id, name: apiKey.name })}
                              title="Delete key"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete
              {deleteTarget?.name ? (
                <>
                  {" "}
                  <span className="font-medium text-foreground">{deleteTarget.name}</span>
                </>
              ) : (
                " this API key"
              )}
              ? This action cannot be undone and any applications using this key will lose access
              immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteApiKey.isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteApiKey.isPending}
              className="gap-2 cursor-pointer"
            >
              {deleteApiKey.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
