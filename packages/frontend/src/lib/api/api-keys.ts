"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "../auth-client";

const API_KEYS_QUERY_KEY = ["api-keys"] as const;

export function useListApiKeys() {
  return useQuery({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: async () => {
      const result = await authClient.apiKey.list();
      if (result.error || !result.data) {
        throw new Error(result.error?.message ?? "Failed to fetch API keys");
      }
      return result.data;
    },
  });
}

export function useGetApiKey(id: string | null) {
  return useQuery({
    queryKey: [...API_KEYS_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error("No key ID provided");
      const result = await authClient.apiKey.get({ query: { id } });
      if (result.error || !result.data) {
        throw new Error(result.error?.message ?? "Failed to fetch API key");
      }
      return result.data;
    },
    enabled: !!id,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["create-api-key"],
    mutationFn: async (payload: { name: string; expiresIn?: number | null }) => {
      const result = await authClient.apiKey.create(payload);
      if (result.error || !result.data) {
        throw new Error(result.error?.message ?? "Failed to create API key");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["update-api-key"],
    mutationFn: async (payload: { keyId: string; name?: string; enabled?: boolean }) => {
      const result = await authClient.apiKey.update(payload);
      if (result.error || !result.data) {
        throw new Error(result.error?.message ?? "Failed to update API key");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["delete-api-key"],
    mutationFn: async (payload: { keyId: string }) => {
      const result = await authClient.apiKey.delete(payload);
      if (result.error || !result.data) {
        throw new Error(result.error?.message ?? "Failed to delete API key");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });
}
