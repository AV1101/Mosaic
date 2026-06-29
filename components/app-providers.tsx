"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {/* Authentication provider removed; the app now runs without sign-in state. */}
      {children}
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
