import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "API Keys | Enfinyte Router",
  description:
    "Create and manage API keys to authenticate requests to the Enfinyte Router.",
};

export default function ApiKeysLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader title="API Keys" />
      {children}
    </>
  );
}
