import type { User } from "@supabase/supabase-js";

import { getAdminSupabaseEnv } from "@/lib/supabase/env";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export type ServerViewer = {
  user: User | null;
  isAdmin: boolean;
  hasPaidEntitlement: boolean;
  email: string | null;
};

function getEmail(user: User | null): string | null {
  return user?.email?.toLowerCase() ?? null;
}

async function ensureProfile(user: User, isAdmin: boolean) {
  const adminClient = getAdminSupabaseClient();
  if (!adminClient) {
    return;
  }

  const adminDb = adminClient as any;

  await adminDb.from("profiles").upsert(
    {
      user_id: user.id,
      email: user.email?.toLowerCase() ?? null,
      display_name:
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
        (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
        null,
      is_admin: isAdmin,
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: false,
    },
  );
}

export async function getServerViewer(): Promise<ServerViewer> {
  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return {
      user: null,
      isAdmin: false,
      hasPaidEntitlement: false,
      email: null,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      isAdmin: false,
      hasPaidEntitlement: false,
      email: null,
    };
  }

  const email = getEmail(user);
  const adminEnv = getAdminSupabaseEnv();
  const isAdmin = !!email && !!adminEnv?.adminEmails.includes(email);

  await ensureProfile(user, isAdmin);

  const [{ data: profile }, { data: entitlements }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("user_entitlements")
      .select("entitlement_key")
      .eq("user_id", user.id)
      .eq("entitlement_key", "core_paid"),
  ]);

  return {
    user,
    isAdmin: isAdmin || profile?.is_admin === true,
    hasPaidEntitlement: (entitlements?.length ?? 0) > 0,
    email,
  };
}

export async function requireAdminViewer(): Promise<ServerViewer> {
  const viewer = await getServerViewer();
  if (!viewer.user || !viewer.isAdmin) {
    throw new Error("FORBIDDEN");
  }

  return viewer;
}
