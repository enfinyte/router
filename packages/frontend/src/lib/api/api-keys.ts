"use client";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "../auth-client";

export function useCreateApiKey() {
  return useMutation({
    mutationKey: ["create-api-key"],
    mutationFn: ({ name }: { name: string }) =>
      authClient.apiKey.create({
        name,
      }),
  });
}
