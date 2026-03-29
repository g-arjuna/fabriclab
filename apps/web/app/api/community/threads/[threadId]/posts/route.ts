import { NextResponse } from "next/server";

import { getServerViewer } from "@/lib/auth/server";
import {
  deriveCommunityAuthorName,
  isMissingCommunityTables,
  type CommunityForumPost,
} from "@/lib/community/forum";
import { getServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const viewer = await getServerViewer();
  if (!viewer.user) {
    return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
  }

  const { threadId } = await params;
  const payload = (await request.json().catch(() => null)) as { body?: string } | null;
  const body = payload?.body?.trim() ?? "";

  if (body.length < 12 || body.length > 4000) {
    return NextResponse.json({ error: "Reply should be between 12 and 4000 characters." }, { status: 400 });
  }

  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const [{ data: thread, error: threadError }, { data: profile }] = await Promise.all([
    supabase
      .from("community_threads")
      .select("id")
      .eq("id", threadId)
      .eq("status", "published")
      .maybeSingle(),
    supabase.from("profiles").select("display_name").eq("user_id", viewer.user.id).maybeSingle(),
  ]);

  if (isMissingCommunityTables(threadError)) {
    return NextResponse.json(
      {
        error: "Community forum tables are not provisioned yet. Apply the latest Supabase migration first.",
        setupPending: true,
      },
      { status: 503 },
    );
  }

  if (threadError) {
    return NextResponse.json({ error: threadError.message }, { status: 500 });
  }

  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const authorName = deriveCommunityAuthorName({
    email: viewer.email,
    fullName: viewer.user.user_metadata?.full_name,
    name: viewer.user.user_metadata?.name,
    displayName: profile?.display_name ?? null,
  });

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      thread_id: threadId,
      user_id: viewer.user.id,
      author_name: authorName,
      author_email: viewer.email,
      body,
      status: "published",
    })
    .select("id, thread_id, body, author_name, created_at")
    .single();

  if (isMissingCommunityTables(error)) {
    return NextResponse.json(
      {
        error: "Community forum tables are not provisioned yet. Apply the latest Supabase migration first.",
        setupPending: true,
      },
      { status: 503 },
    );
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Reply posted.",
    post: data as CommunityForumPost,
  });
}
