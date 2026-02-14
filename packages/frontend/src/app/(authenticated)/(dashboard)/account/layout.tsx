import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Account Settings | Enfinyte Router",
  description:
    "Manage your profile, security, and account preferences for Enfinyte Router.",
};

export default function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader title="Account" />
      {children}
    </>
  );
}
