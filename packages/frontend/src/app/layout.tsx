"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Lexend } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { QUERY_CLIENT } from "@/lib/query-client";
import { QueryProvider } from "@/components/query-provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";

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
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        </head>
        <body className={`${lexend.variable} antialiased`}>
          <QueryProvider client={queryClient}>
            <NuqsAdapter>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <TooltipProvider>{children}</TooltipProvider>
              </ThemeProvider>
            </NuqsAdapter>
          </QueryProvider>
          <Toaster />
        </body>
      </html>
    </>
  );
}
