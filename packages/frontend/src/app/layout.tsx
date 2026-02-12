"use client";

import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { QUERY_CLIENT } from "@/lib/query-client";
import { QueryProvider } from "@/components/query-provider";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(QUERY_CLIENT);

  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
        </head>
        <body className={`${lexend.variable} antialiased`}>
          <QueryProvider client={queryClient}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </QueryProvider>
          <Toaster />
        </body>
      </html>
    </>
  );
}
