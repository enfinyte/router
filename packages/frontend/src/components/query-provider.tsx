"use client";

import * as React from "react";
import { QueryClientProvider as TanstackQueryProvider } from "@tanstack/react-query";

export function QueryProvider({
  children,
  ...props
}: React.ComponentProps<typeof TanstackQueryProvider>) {
  return <TanstackQueryProvider {...props}>{children}</TanstackQueryProvider>;
}
