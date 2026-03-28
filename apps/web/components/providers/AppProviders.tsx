"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProgressSync } from "@/components/auth/ProgressSync";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProgressSync />
      {children}
    </AuthProvider>
  );
}
