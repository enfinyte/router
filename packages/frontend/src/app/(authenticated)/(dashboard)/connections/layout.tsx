import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Providers | Enfinyte Router",
  description:
    "Configure and manage your AI providers for the Enfinyte Router.",
};

export default function ConnectionsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader title="Providers" />
      {children}
    </>
  );
}
