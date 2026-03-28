import { createClient } from "@supabase/supabase-js";

import { getAdminSupabaseEnv } from "@/lib/supabase/env";

let adminClient: ReturnType<typeof createClient> | null = null;

export function getAdminSupabaseClient() {
  if (adminClient) {
    return adminClient;
  }

  const env = getAdminSupabaseEnv();
  if (!env) {
    return null;
  }

  adminClient = createClient(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

