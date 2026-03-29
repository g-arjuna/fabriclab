import { NextResponse } from "next/server";

import { getServerViewer } from "@/lib/auth/server";
import { getSourceCatalogItem, type CatalogKind } from "@/lib/catalog/source";
import {
  deriveCommunityAuthorName,
  isMissingCommunityTables,
  parseCommunityThreadType,
  type CommunityForumThread,
} from "@/lib/community/forum";
import { createGitHubIssueFromThread, getGitHubIssueMirrorPublicAvailability } from "@/lib/community/github";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

type ThreadRow = Omit<CommunityForumThread, "reply_count"> & {
  community_posts?: { id: string }[];
};

function parseCatalogKind(value: unknown): CatalogKind | null {
  if (value === "chapter" || value === "lab") {
    return value;
  }

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const threadType = parseCommunityThreadType(url.searchParams.get("type") ?? "general");
  const contentKind = parseCatalogKind(url.searchParams.get("kind"));
  const contentSlug = url.searchParams.get("slug")?.trim() ?? "";

  if (!threadType) {
    return NextResponse.json({ error: "A valid thread type is required." }, { status: 400 });
  }

  if (threadType !== "general") {
    if (contentKind !== threadType || !contentSlug || !getSourceCatalogItem(contentKind, contentSlug)) {
      return NextResponse.json({ error: "A valid chapter or lab target is required." }, { status: 400 });
    }
  }

  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ enabled: false, setupPending: false, threads: [] satisfies CommunityForumThread[] });
  }

  let query = supabase
    .from("community_threads")
    .select("id, thread_type, content_kind, content_slug, title, body, author_name, created_at, github_issue_url, community_posts(id)")
    .eq("status", "published")
    .eq("thread_type", threadType)
    .order("created_at", { ascending: false })
    .limit(50);

  if (threadType !== "general") {
    query = query.eq("content_kind", contentKind!).eq("content_slug", contentSlug);
  }

  const { data, error } = await query;

  if (isMissingCommunityTables(error)) {
    return NextResponse.json({ enabled: true, setupPending: true, threads: [] satisfies CommunityForumThread[] });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const threads = ((data ?? []) as ThreadRow[]).map((thread) => ({
    id: thread.id,
    thread_type: thread.thread_type,
    content_kind: thread.content_kind,
    content_slug: thread.content_slug,
    title: thread.title,
    body: thread.body,
    author_name: thread.author_name,
    created_at: thread.created_at,
    github_issue_url: thread.github_issue_url,
    reply_count: thread.community_posts?.length ?? 0,
  }));

  return NextResponse.json({
    enabled: true,
    setupPending: false,
    threads,
    githubIssueMirrorAvailable: getGitHubIssueMirrorPublicAvailability(),
  });
}

export async function POST(request: Request) {
  const viewer = await getServerViewer();
  if (!viewer.user) {
    return NextResponse.json({ error: "Sign in to start a discussion." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        threadType?: string;
        contentKind?: string | null;
        contentSlug?: string | null;
        title?: string;
        body?: string;
        openGitHubIssue?: boolean;
      }
    | null;

  const threadType = parseCommunityThreadType(payload?.threadType ?? "general");
  const contentKind = parseCatalogKind(payload?.contentKind);
  const contentSlug = payload?.contentSlug?.trim() ?? "";
  const title = payload?.title?.trim() ?? "";
  const body = payload?.body?.trim() ?? "";
  const openGitHubIssue = payload?.openGitHubIssue === true;

  if (!threadType) {
    return NextResponse.json({ error: "A valid thread type is required." }, { status: 400 });
  }

  if (title.length < 6 || title.length > 160) {
    return NextResponse.json({ error: "Title should be between 6 and 160 characters." }, { status: 400 });
  }

  if (body.length < 20 || body.length > 5000) {
    return NextResponse.json({ error: "Opening post should be between 20 and 5000 characters." }, { status: 400 });
  }

  if (threadType !== "general") {
    if (contentKind !== threadType || !contentSlug || !getSourceCatalogItem(contentKind, contentSlug)) {
      return NextResponse.json({ error: "A valid chapter or lab target is required." }, { status: 400 });
    }
  }

  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", viewer.user.id)
    .maybeSingle();

  const authorName = deriveCommunityAuthorName({
    email: viewer.email,
    fullName: viewer.user.user_metadata?.full_name,
    name: viewer.user.user_metadata?.name,
    displayName: profile?.display_name ?? null,
  });

  const { data, error } = await supabase
    .from("community_threads")
    .insert({
      thread_type: threadType,
      content_kind: threadType === "general" ? null : contentKind,
      content_slug: threadType === "general" ? null : contentSlug,
      user_id: viewer.user.id,
      author_name: authorName,
      author_email: viewer.email,
      title,
      body,
      status: "published",
    })
    .select("id, thread_type, content_kind, content_slug, title, body, author_name, created_at, github_issue_url")
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

  let message = "Discussion created.";
  let githubIssueUrl: string | null = (data as { github_issue_url: string | null }).github_issue_url;
  const appEnv = getPublicSupabaseEnv();

  if (openGitHubIssue && appEnv) {
    const threadUrl = `${appEnv.appUrl}/community/${(data as { id: string }).id}`;
    const issueResult = await createGitHubIssueFromThread({
      title,
      body,
      authorName,
      threadUrl,
    });

    if (issueResult.ok) {
      githubIssueUrl = issueResult.issueUrl;
      await supabase
        .from("community_threads")
        .update({
          github_issue_url: issueResult.issueUrl,
          github_issue_number: issueResult.issueNumber,
        })
        .eq("id", (data as { id: string }).id);
      message = `Discussion created and mirrored to GitHub issue #${issueResult.issueNumber}.`;
    } else {
      message = `Discussion created, but GitHub issue mirroring was skipped: ${issueResult.error}`;
    }
  }

  return NextResponse.json({
    message,
    thread: {
      ...(data as Omit<CommunityForumThread, "reply_count">),
      github_issue_url: githubIssueUrl,
      reply_count: 0,
    } satisfies CommunityForumThread,
  });
}
