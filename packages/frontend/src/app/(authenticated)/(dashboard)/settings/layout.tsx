import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Settings | Enfinyte Router",
  description:
    "Configure routing defaults and preferences for Enfinyte Router.",
};

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader title="Settings" />
      {children}
    </>
  );
}
