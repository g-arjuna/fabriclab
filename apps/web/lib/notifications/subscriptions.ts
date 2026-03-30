import type { ViewerUser } from "@/lib/auth/types";

export async function ensureViewerNotificationSubscription(
  admin: any,
  viewer: { user: ViewerUser; email: string | null },
) {
  const email = viewer.email?.trim().toLowerCase();
  if (!email) {
    return;
  }

  await admin.from("email_subscriptions").upsert(
    {
      user_id: viewer.user.id,
      email,
      display_name: viewer.user.user_metadata?.full_name ?? viewer.user.user_metadata?.name ?? null,
    },
    { onConflict: "user_id", ignoreDuplicates: false },
  );
}

type SubscriptionRow = {
  user_id: string;
  email: string;
};

export async function listNewContentNotificationRecipients(admin: any): Promise<SubscriptionRow[]> {
  const adminDb = admin as any;
  const { data } = await adminDb
    .from("email_subscriptions")
    .select("user_id,email")
    .eq("notify_new_content", true);

  return ((data ?? []) as SubscriptionRow[]).filter((entry) => typeof entry.email === "string" && entry.email.length > 0);
}

export async function listThreadActivityRecipients(admin: any, threadId: string): Promise<SubscriptionRow[]> {
  const adminDb = admin as any;
  const [{ data: thread }, { data: posts }] = await Promise.all([
    adminDb.from("community_threads").select("user_id, author_email").eq("id", threadId).maybeSingle(),
    adminDb.from("community_posts").select("user_id, author_email").eq("thread_id", threadId),
  ]);

  const participantIds = new Set<string>();
  if (thread?.user_id) {
    participantIds.add(thread.user_id);
  }

  for (const post of (posts ?? []) as Array<{ user_id: string | null }>) {
    if (post.user_id) {
      participantIds.add(post.user_id);
    }
  }

  if (participantIds.size === 0) {
    return [];
  }

  const { data } = await adminDb
    .from("email_subscriptions")
    .select("user_id,email")
    .eq("notify_thread_activity", true)
    .in("user_id", Array.from(participantIds));

  return ((data ?? []) as SubscriptionRow[]).filter((entry) => typeof entry.email === "string" && entry.email.length > 0);
}

export async function listGlobalThreadActivityRecipients(admin: any): Promise<SubscriptionRow[]> {
  const adminDb = admin as any;
  const { data } = await adminDb.from("email_subscriptions").select("user_id,email").eq("notify_thread_activity", true);
  return ((data ?? []) as SubscriptionRow[]).filter((entry) => typeof entry.email === "string" && entry.email.length > 0);
}
