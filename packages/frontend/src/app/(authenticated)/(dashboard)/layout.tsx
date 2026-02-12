import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Enfinyte Router",
  description: "Opensource Smart Router for LLM Models",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
