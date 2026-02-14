import { Lexend } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        </head>
        <body className={`${lexend.variable} antialiased`}>
          <Providers>{children}</Providers>
        </body>
      </html>
    </>
  );
}
