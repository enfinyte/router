"use client";
import { useQuery } from "@tanstack/react-query";
import ky from "ky";
import { BASE_URL } from ".";

export function useGetModels(provider?: string) {
  return useQuery({
    queryKey: ["models", provider],
    queryFn: () =>
      ky
        .get(`${BASE_URL}/v1/models`, {
          searchParams: provider ? { provider } : {},
          credentials: "include",
        })
        .json<{ models: Record<string, string[]> }>(),
  });
}
