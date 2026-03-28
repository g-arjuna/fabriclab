"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicSupabaseEnv } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient(): SupabaseClient | null {
  if (browserClient) {
    return browserClient;
  }

  const env = getPublicSupabaseEnv();
  if (!env) {
    return null;
  }

  browserClient = createBrowserClient(env.url, env.anonKey);
  return browserClient;
}

