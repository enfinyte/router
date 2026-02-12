"use client";
import { useMutation } from "@tanstack/react-query";

export function useAddSecret() {
  return useMutation({
    mutationKey: ["add-secret"],
    mutationFn: (payload: { provider: string; keys: Record<string, string> }) => {},
  });
}
