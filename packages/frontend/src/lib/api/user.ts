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
