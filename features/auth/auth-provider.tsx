"use client";

import { createContext, useContext, useMemo } from "react";
import type { AuthUser, UserRole } from "@/features/auth/types";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; name: string; password: string; role: UserRole }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<AuthContextValue>(
    () => ({
      user: null,
      isLoading: false,
      async login() {
        // Authentication has been removed; this method is kept only for compatibility.
      },
      async register() {
        // Authentication has been removed; this method is kept only for compatibility.
      },
      logout() {
        // Authentication has been removed; this method is kept only for compatibility.
      }
    }),
    []
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
