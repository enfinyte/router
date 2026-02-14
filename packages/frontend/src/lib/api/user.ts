import { useMutation, useQuery } from "@tanstack/react-query";
import { authClient } from "../auth-client";

export function useGetUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const session = await authClient.getSession();

      if (session.error || !session.data) {
        const message = session.error?.message || "Failed to fetch user session";
        throw new Error(message, { cause: session.error });
      }

      return session.data.user;
    },
  });
}

export function useLogoutUser() {
  return useMutation({
    mutationKey: ["user", "logout"],
    mutationFn: async () => authClient.signOut(),
  });
}

export function useUpdateUser() {
  return useMutation({
    mutationKey: ["user", "update"],
    mutationFn: async (data: { name?: string; image?: string }) => authClient.updateUser(data),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationKey: ["user", "change-password"],
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
      revokeOtherSessions?: boolean;
    }) => authClient.changePassword(data),
  });
}

export function useListSessions() {
  return useQuery({
    queryKey: ["user", "sessions"],
    queryFn: async () => {
      const res = await authClient.listSessions();
      if (res.error) throw new Error(res.error.message ?? "Failed to list sessions");
      return res.data;
    },
  });
}

export function useRevokeSession() {
  return useMutation({
    mutationKey: ["user", "revoke-session"],
    mutationFn: async (token: string) => authClient.revokeSession({ token }),
  });
}

export function useListAccounts() {
  return useQuery({
    queryKey: ["user", "accounts"],
    queryFn: async () => {
      const res = await authClient.listAccounts();
      if (res.error) throw new Error(res.error.message ?? "Failed to list accounts");
      return res.data;
    },
  });
}

export function useDeleteUser() {
  return useMutation({
    mutationKey: ["user", "delete"],
    mutationFn: async () => authClient.deleteUser(),
  });
}
