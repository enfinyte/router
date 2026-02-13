"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import ky from "ky";
import { BASE_URL } from ".";

export function useAddSecret() {
  return useMutation({
    mutationKey: ["add-secret"],
    mutationFn: (payload: { provider: string; keys: Record<string, string> }) =>
      ky
        .post(`${BASE_URL}/v1/secret`, { json: payload, credentials: "include" })
        .json<{ success: boolean }>(),
  });
}

export function useGetAllSecrets() {
  return useQuery({
    queryKey: ["fetch-secrets"],
    queryFn: () =>
      ky.get(`${BASE_URL}/v1/secret`, { credentials: "include" }).json<{
        providers: {
          [providerId: string]: {
            fields: string[];
            enabled: boolean;
          };
        };
      }>(),
  });
}
