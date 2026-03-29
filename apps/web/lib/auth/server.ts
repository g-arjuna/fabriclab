import { getAdminSupabaseEnv } from "@/lib/supabase/env";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { readSessionUserFromCookies } from "@/lib/auth/session";
import type { ViewerUser } from "@/lib/auth/types";

export type ServerViewer = {
  user: ViewerUser | null;
  isAdmin: boolean;
  hasPaidEntitlement: boolean;
  email: string | null;
};

function getEmail(user: ViewerUser | null): string | null {
  return user?.email?.toLowerCase() ?? null;
}

async function ensureProfile(user: ViewerUser, isAdmin: boolean) {
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
  const viewerUser = await readSessionUserFromCookies();

  if (!viewerUser) {
    return {
      user: null,
      isAdmin: false,
      hasPaidEntitlement: false,
      email: null,
    };
  }

  const email = getEmail(viewerUser);
  const adminEnv = getAdminSupabaseEnv();
  const isAdmin = !!email && !!adminEnv?.adminEmails.includes(email);

  await ensureProfile(viewerUser, isAdmin);
  const adminClient = getAdminSupabaseClient();
  if (!adminClient) {
    return {
      user: viewerUser,
      isAdmin,
      hasPaidEntitlement: false,
      email,
    };
  }

  const adminDb = adminClient as any;

  const [{ data: profile }, { data: entitlements }] = await Promise.all([
    adminDb.from("profiles").select("is_admin").eq("user_id", viewerUser.id).maybeSingle(),
    adminDb
      .from("user_entitlements")
      .select("entitlement_key")
      .eq("user_id", viewerUser.id)
      .eq("entitlement_key", "core_paid"),
  ]);

  return {
    user: viewerUser,
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
