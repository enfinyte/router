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
    <div className="flex flex-col h-screen max-h-[100dvh] md:max-h-[calc(100dvh-1rem)] overflow-hidden">
      <SiteHeader title="Playground" />
      {children}
    </div>
  );
}
