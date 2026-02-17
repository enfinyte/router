"use client";

import { useState, useCallback, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useGetUser,
  useUpdateUser,
  useChangePassword,
  useListSessions,
  useListAccounts,
  useRevokeSession,
  useDeleteUser,
} from "@/lib/api/user";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Monitor, Smartphone, Save, Mail } from "lucide-react";
import {
  IconShield,
  IconUserCircle,
  IconAlertTriangle,
  IconBrandGithub,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";


export default function AccountPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: user, isLoading: isUserLoading } = useGetUser();
  const { data: accounts } = useListAccounts();
  const { data: sessions, isLoading: isSessionsLoading } = useListSessions();

  const updateUser = useUpdateUser();
  const changePassword = useChangePassword();
  const revokeSession = useRevokeSession();
  const deleteUser = useDeleteUser();

  const [editedName, setEditedName] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const displayName = editedName ?? user?.name ?? "";
  const hasNameChanged = editedName !== null && editedName !== user?.name;

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user?.name]);

  const linkedProviders = useMemo(() => {
    if (!accounts) return [];
    return accounts.map((a) => a.providerId);
  }, [accounts]);

  const hasCredentialAccount = useMemo(
    () => linkedProviders.includes("credential"),
    [linkedProviders],
  );

  const isPasswordFormValid = useMemo(
    () => !!(currentPassword && newPassword && confirmPassword),
    [currentPassword, newPassword, confirmPassword],
  );

  const parsedSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.map((session) => {
      const ua = session.userAgent;
      let browser = "Unknown";
      let os = "Unknown";
      let isMobile = false;

      if (ua) {
        isMobile = /mobile|android|iphone|ipad/i.test(ua);

        if (ua.includes("Firefox/")) browser = "Firefox";
        else if (ua.includes("Edg/")) browser = "Edge";
        else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";
        else if (ua.includes("Chrome/") && ua.includes("Safari/")) browser = "Chrome";
        else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";

        if (ua.includes("Windows")) os = "Windows";
        else if (ua.includes("Mac OS X")) os = "macOS";
        else if (ua.includes("Linux")) os = "Linux";
        else if (ua.includes("Android")) os = "Android";
        else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
      }

      return { ...session, browser, os, isMobile };
    });
  }, [sessions]);

  const handleUpdateProfile = useCallback(async () => {
    if (!editedName?.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      await updateUser.mutateAsync({ name: editedName });
      setEditedName(null);
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    }
  }, [editedName, updateUser, queryClient]);

  const handleChangePassword = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setRevokeOtherSessions(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change password";
      toast.error(message);
    }
  }, [currentPassword, newPassword, confirmPassword, revokeOtherSessions, changePassword]);

  const handleRevokeSession = useCallback(
    async (token: string) => {
      try {
        await revokeSession.mutateAsync(token);
        await queryClient.invalidateQueries({ queryKey: ["user", "sessions"] });
        toast.success("Session revoked");
      } catch {
        toast.error("Failed to revoke session");
      }
    },
    [revokeSession, queryClient],
  );

  const handleDeleteAccount = useCallback(async () => {
    try {
      await deleteUser.mutateAsync();
      toast.success("Account deleted");
      router.push("/auth");
    } catch {
      toast.error("Failed to delete account");
    }
  }, [deleteUser, router]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    setIsDeleteDialogOpen(open);
  }, []);

  const handleRevokeOtherSessionsChange = useCallback((c: boolean | "indeterminate") => {
    setRevokeOtherSessions(!!c);
  }, []);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 w-full max-w-3xl mx-auto">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <IconUserCircle className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold tracking-tight">Profile</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage your personal information and display preferences.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              {isUserLoading ? (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-7 w-32" />
                      <Skeleton className="h-5 w-44" />
                      <div className="pt-0.5">
                        <Skeleton className="h-[22px] w-20 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <div className="flex gap-2">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 w-10 shrink-0" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-3.5 w-52" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-medium text-lg">{user?.name}</h3>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                      {linkedProviders.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {linkedProviders.map((provider) => (
                            <Badge
                              key={provider}
                              variant="outline"
                              className="px-2 py-0 text-[12px] font-medium gap-1"
                            >
                              {provider === "github" && <IconBrandGithub className="size-5" />}
                              {provider === "credential" && <Mail className="h-3 w-3" />}
                              {provider === "github"
                                ? "GitHub"
                                : provider === "credential"
                                  ? "Email"
                                  : provider}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                        Display Name
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="name"
                          value={displayName}
                          onChange={(e) => setEditedName(e.target.value)}
                          placeholder="Your name"
                          className="bg-background border-border text-sm h-9"
                        />
                        <Button
                          onClick={handleUpdateProfile}
                          disabled={updateUser.isPending || !hasNameChanged}
                          className="cursor-pointer"
                        >
                          {updateUser.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-muted border-border text-sm h-9 text-muted-foreground"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Contact support to change your email address.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <IconShield className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold tracking-tight">Security</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {hasCredentialAccount ? "Manage your password and active sessions." : "Manage your active sessions."}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 space-y-8">
              <div className="space-y-4">
                <h3 className="text-base font-medium">Change Password</h3>
                {hasCredentialAccount ? (
                <div className="grid gap-4 max-w-md">
                  <div className="space-y-2">
                    <Label
                      htmlFor="current-password"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Current Password
                    </Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="bg-background border-border text-sm h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="new-password"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      New Password
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-background border-border text-sm h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirm-password"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-background border-border text-sm h-9"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="revoke-sessions"
                      checked={revokeOtherSessions}
                      onCheckedChange={handleRevokeOtherSessionsChange}
                    />
                    <Label htmlFor="revoke-sessions" className="cursor-pointer">
                      Sign out of other devices
                    </Label>
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={changePassword.isPending || !isPasswordFormValid}
                    className="self-start cursor-pointer"
                  >
                    {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                  </Button>
                </div>
                ) : (
                <p className="text-sm text-muted-foreground">
                  Password management is not available for social login accounts. Your account is secured through your linked provider.
                </p>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-base font-medium">Active Sessions</h3>

                {isSessionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-md border bg-background"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                          <div className="flex flex-col gap-0.5">
                            <Skeleton className="h-5 w-36" />
                            <Skeleton className="h-4 w-48" />
                          </div>
                        </div>
                        <Skeleton className="h-8 w-16 rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {parsedSessions.map((session) => (
                      <div
                        key={session.token}
                        className="flex items-center justify-between p-3 rounded-md border bg-background"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 flex items-center justify-center rounded-full bg-muted">
                            {session.isMobile ? (
                              <Smartphone className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Monitor className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {session.browser !== "Unknown" || session.os !== "Unknown"
                                ? `${session.browser}${session.os !== "Unknown" ? ` on ${session.os}` : ""}`
                                : "Unknown Device"}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {session.ipAddress && <span>{session.ipAddress}</span>}
                              {session.ipAddress && session.createdAt && <span>·</span>}
                              {session.createdAt && (
                                <span>
                                  Signed in{" "}
                                  {formatDistanceToNow(new Date(session.createdAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSession(session.token)}
                          disabled={revokeSession.isPending}
                          className="cursor-pointer text-muted-foreground hover:text-red-600"
                        >
                          Revoke
                        </Button>
                      </div>
                    ))}
                    {parsedSessions.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No active sessions found.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-destructive">
              <IconAlertTriangle className="h-5 w-5" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Danger Zone</h2>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900/20 dark:bg-red-950/10 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-medium text-red-900 dark:text-red-200">Delete Account</h3>
                  <p className="text-sm text-red-700/80 dark:text-red-300/70">
                    Permanently delete your account and all associated data.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteDialogChange(true)}
                  className="cursor-pointer shrink-0"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent. All your data, API keys, and provider connections will be
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDeleteDialogChange(false)}
              disabled={deleteUser.isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteUser.isPending}
              className="cursor-pointer"
            >
              {deleteUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
