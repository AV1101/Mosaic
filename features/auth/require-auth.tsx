"use client";

import type { UserRole } from "@/features/auth/types";

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  void roles;
  // Authentication has been removed; this wrapper is kept as a compatibility pass-through.
  return <>{children}</>;
}
