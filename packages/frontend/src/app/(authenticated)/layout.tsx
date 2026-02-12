import { authClient } from "@/lib/auth-client";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Enfinyte Router",
  description: "Opensource Smart Router for LLM Models",
};

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (!session) redirect("/auth");

  return <>{children}</>;
}
