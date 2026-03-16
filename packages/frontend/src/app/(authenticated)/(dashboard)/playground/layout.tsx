import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Playground | Enfinyte Router",
  description:
    "Test and interact with LLM models through the Enfinyte Router in real time.",
};

export default function PlaygroundLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader title="Playground" />
      {children}
    </>
  );
}
