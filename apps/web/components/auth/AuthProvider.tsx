"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ViewerUser } from "@/lib/auth/types";

type AuthContextValue = {
  user: ViewerUser | null;
  session: { user: ViewerUser } | null;
  loading: boolean;
  enabled: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readSession() {
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        session: null,
        user: null,
        enabled: false,
      };
    }

    const payload = (await response.json()) as { user: ViewerUser | null; authenticated: boolean };
    if (!payload.authenticated || !payload.user) {
      return {
        session: null,
        user: null,
        enabled: true,
      };
    }

    return {
      session: { user: payload.user },
      user: payload.user,
      enabled: true,
    };
  } catch {
    return {
      session: null,
      user: null,
      enabled: false,
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ViewerUser | null>(null);
  const [session, setSession] = useState<{ user: ViewerUser } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      const next = await readSession();
      if (!active) {
        return;
      }

      setSession(next.session);
      setUser(next.user);
      setEnabled(next.enabled);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      enabled,
      refresh: async () => {
        const next = await readSession();
        setSession(next.session);
        setUser(next.user);
        setEnabled(next.enabled);
      },
      signOut: async () => {
        await fetch("/api/auth/logout", {
          method: "POST",
        });
        setSession(null);
        setUser(null);
      },
    }),
    [enabled, loading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
