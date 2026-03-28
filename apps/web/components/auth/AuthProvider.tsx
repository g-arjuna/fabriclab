"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  enabled: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readSession() {
  const client = getBrowserSupabaseClient();
  if (!client) {
    return {
      session: null,
      user: null,
      enabled: false,
    };
  }

  const {
    data: { session },
  } = await client.auth.getSession();

  return {
    session,
    user: session?.user ?? null,
    enabled: true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const enabled = getBrowserSupabaseClient() !== null;

  useEffect(() => {
    let active = true;

    void (async () => {
      const next = await readSession();
      if (!active) {
        return;
      }

      setSession(next.session);
      setUser(next.user);
      setLoading(false);
    })();

    const client = getBrowserSupabaseClient();
    if (!client) {
      return () => {
        active = false;
      };
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
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
      },
      signOut: async () => {
        const client = getBrowserSupabaseClient();
        if (!client) {
          return;
        }

        await client.auth.signOut();
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

