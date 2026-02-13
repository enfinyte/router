import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found | Enfinyte Router",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform pointer-events-none">
        <div className="h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="z-10 flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-mono text-[10rem] font-bold leading-none tracking-tighter text-primary/15 select-none sm:text-[14rem]">
          404
        </h1>

        <div className="flex flex-col items-center gap-6 -mt-10 sm:-mt-16">
          <div className="relative h-10 w-10 sm:h-12 sm:w-12 drop-shadow-sm">
            <Image
              src="/logo-transparent.svg"
              alt="Enfinyte Logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Page not found
            </h2>
            <p className="text-muted-foreground">
              The page you are looking for doesn&apos;t exist or has been moved.
            </p>
          </div>

          <div className="pt-2">
            <Button asChild size="lg" className="px-8 shadow-lg shadow-primary/10">
              <Link href="/">
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
