import { NextResponse } from "next/server";

import { requireAdminViewer } from "@/lib/auth/server";
import { closeGitHubIssue } from "@/lib/community/github";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

const THREAD_PATTERNS = [
  /^GitHub mirror permission probe\b/i,
  /^Notification smoke thread\b/i,
  /^Direct smoke thread\b/i,
];

const AUTHOR_PATTERNS = [/smoke/i, /probe/i];

type CleanupRow = {
  id: string;
  title: string;
  author_name: string | null;
  github_issue_number: number | null;
};

function isSmokeArtifact(row: CleanupRow) {
  const title = row.title.trim();
  const authorName = row.author_name?.trim() ?? "";
  return (
    THREAD_PATTERNS.some((pattern) => pattern.test(title)) ||
    AUTHOR_PATTERNS.some((pattern) => pattern.test(authorName))
  );
}

export async function POST() {
  try {
    await requireAdminViewer();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }
  const adminDb = admin as any;

  const { data, error } = await adminDb
    .from("community_threads")
    .select("id, title, author_name, github_issue_number")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matches = ((data ?? []) as CleanupRow[]).filter(isSmokeArtifact);
  const threadIds = matches.map((row) => row.id);

  const closedIssues: number[] = [];
  const skippedIssueClosures: string[] = [];

  for (const row of matches) {
    if (!row.github_issue_number) {
      continue;
    }

    const result = await closeGitHubIssue(row.github_issue_number);
    if (result.ok) {
      closedIssues.push(row.github_issue_number);
    } else {
      skippedIssueClosures.push(`#${row.github_issue_number}: ${result.error}`);
    }
  }

  let deletedPosts = 0;
  if (threadIds.length > 0) {
    const { data: posts, error: postsError } = await adminDb
      .from("community_posts")
      .delete()
      .in("thread_id", threadIds)
      .select("id");

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    deletedPosts = posts?.length ?? 0;

    const { error: threadsError } = await adminDb.from("community_threads").delete().in("id", threadIds);
    if (threadsError) {
      return NextResponse.json({ error: threadsError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    matchedThreads: matches.map((row) => ({ id: row.id, title: row.title })),
    deletedThreads: threadIds,
    deletedPosts,
    closedIssues,
    skippedIssueClosures,
  });
}
