import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication | Enfinyte Router",
  description: "Login or register to access your account and manage your settings.",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
