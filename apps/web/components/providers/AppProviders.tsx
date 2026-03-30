"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProgressSync } from "@/components/auth/ProgressSync";
import { NotificationOnboardingPrompt } from "@/components/notifications/NotificationOnboardingPrompt";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProgressSync />
      <NotificationOnboardingPrompt />
      {children}
    </AuthProvider>
  );
}
