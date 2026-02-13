import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect Providers | Enfinyte Router",
  description: "Onboarding process to connect your LLM providers and start routing requests.",
};

export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
