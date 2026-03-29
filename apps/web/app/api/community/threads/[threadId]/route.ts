import { NextResponse } from "next/server";

import {
  isMissingCommunityTables,
  type CommunityForumPost,
  type CommunityForumThread,
} from "@/lib/community/forum";
import { getServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

type ThreadRow = Omit<CommunityForumThread, "reply_count"> & {
  community_posts?: { id: string }[];
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { threadId } = await params;

  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ enabled: false, setupPending: false, thread: null, posts: [] satisfies CommunityForumPost[] });
  }

  const [{ data: thread, error: threadError }, { data: posts, error: postsError }] = await Promise.all([
    supabase
      .from("community_threads")
      .select("id, thread_type, content_kind, content_slug, title, body, author_name, created_at, github_issue_url, community_posts(id)")
      .eq("id", threadId)
      .eq("status", "published")
      .maybeSingle(),
    supabase
      .from("community_posts")
      .select("id, thread_id, body, author_name, created_at")
      .eq("thread_id", threadId)
      .eq("status", "published")
      .order("created_at", { ascending: true }),
  ]);

  if (isMissingCommunityTables(threadError) || isMissingCommunityTables(postsError)) {
    return NextResponse.json({ enabled: true, setupPending: true, thread: null, posts: [] satisfies CommunityForumPost[] });
  }

  if (threadError) {
    return NextResponse.json({ error: threadError.message }, { status: 500 });
  }

  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  if (postsError) {
    return NextResponse.json({ error: postsError.message }, { status: 500 });
  }

  const mappedThread = {
    id: (thread as ThreadRow).id,
    thread_type: (thread as ThreadRow).thread_type,
    content_kind: (thread as ThreadRow).content_kind,
    content_slug: (thread as ThreadRow).content_slug,
    title: (thread as ThreadRow).title,
    body: (thread as ThreadRow).body,
    author_name: (thread as ThreadRow).author_name,
    created_at: (thread as ThreadRow).created_at,
    github_issue_url: (thread as ThreadRow).github_issue_url,
    reply_count: (thread as ThreadRow).community_posts?.length ?? 0,
  } satisfies CommunityForumThread;

  return NextResponse.json({
    enabled: true,
    setupPending: false,
    thread: mappedThread,
    posts: (posts ?? []) as CommunityForumPost[],
  });
}
