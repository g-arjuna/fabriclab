import { NextResponse } from "next/server";

import { getServerViewer } from "@/lib/auth/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const viewer = await getServerViewer();
  if (!viewer.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  }
  const adminDb = admin as any;

  const { data, error } = await adminDb
    .from("email_subscriptions")
    .select("notify_new_content, notify_thread_activity, email, preferences_confirmed")
    .eq("user_id", viewer.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    subscribed: true,
    hasSavedPreferences: Boolean(data?.preferences_confirmed),
    email: data?.email ?? viewer.email,
    notifyNewContent: data?.notify_new_content ?? true,
    notifyThreadActivity: data?.notify_thread_activity ?? true,
  });
}

export async function PUT(request: Request) {
  const viewer = await getServerViewer();
  if (!viewer.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  }
  const adminDb = admin as any;
  const { data: existing, error: existingError } = await adminDb
    .from("email_subscriptions")
    .select("notify_new_content, notify_thread_activity, preferences_confirmed")
    .eq("user_id", viewer.user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as
    | { notifyNewContent?: boolean; notifyThreadActivity?: boolean }
    | null;

  const notifyNewContent = body?.notifyNewContent ?? existing?.notify_new_content ?? true;
  const notifyThreadActivity = body?.notifyThreadActivity ?? existing?.notify_thread_activity ?? true;
  const email = viewer.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "A verified account email is required for notifications." }, { status: 400 });
  }

  const { error } = await adminDb.from("email_subscriptions").upsert(
    {
      user_id: viewer.user.id,
      email,
      display_name: viewer.user.user_metadata?.full_name ?? viewer.user.user_metadata?.name ?? null,
      notify_new_content: notifyNewContent,
      notify_thread_activity: notifyThreadActivity,
      preferences_confirmed: true,
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    hasSavedPreferences: true,
    notifyNewContent,
    notifyThreadActivity,
  });
}
