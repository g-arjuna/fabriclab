import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAdminSupabaseEnv } from "@/lib/supabase/env";

export async function resolveSupabaseUserIdByEmail(
  email: string,
  displayName?: string | null,
): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const admin = getAdminSupabaseClient();
  const env = getAdminSupabaseEnv();

  if (!admin || !env) {
    return null;
  }

  const adminDb = admin as any;
  const { data: existingProfile } = await adminDb
    .from("profiles")
    .select("user_id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile?.user_id) {
    return existingProfile.user_id;
  }

  const linkResponse = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalizedEmail,
    options: {
      redirectTo: `${env.appUrl}/auth/callback`,
    },
  });

  const userId = linkResponse.data?.user?.id ?? null;
  if (!userId) {
    return null;
  }

  await adminDb.from("profiles").upsert(
    {
      user_id: userId,
      email: normalizedEmail,
      display_name: displayName ?? null,
      is_admin: env.adminEmails.includes(normalizedEmail),
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: false,
    },
  );

  return userId;
}

