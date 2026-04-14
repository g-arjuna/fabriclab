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
const SMOKE_EMAIL_PATTERNS = [
  /^notifications-onboarding(?:-[\w.-]+)?@fabriclab\.dev$/i,
  /^community-replies(?:-[\w.-]+)?@fabriclab\.dev$/i,
  /^smoke-learner@fabriclab\.dev$/i,
];

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

function isSmokeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return SMOKE_EMAIL_PATTERNS.some((pattern) => pattern.test(normalized));
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

  const authUsers: Array<{ id: string; email?: string | null }> = [];
  let page = 1;

  for (;;) {
    const { data: authPage, error: authError } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const users = authPage?.users ?? [];
    authUsers.push(...users.map((user) => ({ id: user.id, email: user.email })));

    if (users.length < 1000) {
      break;
    }

    page += 1;
  }

  const smokeUsers = authUsers.filter((user) => isSmokeEmail(user.email));
  const smokeUserIds = smokeUsers.map((user) => user.id);
  const deletedUserEmails: string[] = [];

  const { data, error } = await adminDb
    .from("community_threads")
    .select("id, title, author_name, github_issue_number")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matches = ((data ?? []) as CleanupRow[]).filter(isSmokeArtifact);
  const threadIds = new Set(matches.map((row) => row.id));

  let smokeThreads: CleanupRow[] = [];

  if (smokeUserIds.length > 0) {
    const { data: smokeThreadRows, error: smokeThreadsError } = await adminDb
      .from("community_threads")
      .select("id, title, author_name, github_issue_number")
      .in("user_id", smokeUserIds);

    if (smokeThreadsError) {
      return NextResponse.json({ error: smokeThreadsError.message }, { status: 500 });
    }

    smokeThreads = (smokeThreadRows ?? []) as CleanupRow[];

    for (const row of smokeThreads) {
      threadIds.add(row.id);
    }
  }

  const allMatchedThreads = ((data ?? []) as CleanupRow[]).concat(smokeThreads);
  const uniqueMatchedThreads = Array.from(
    new Map(allMatchedThreads.map((row) => [row.id, row])).values(),
  );

  const closedIssues: number[] = [];
  const skippedIssueClosures: string[] = [];

  for (const row of uniqueMatchedThreads) {
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
  const threadIdList = Array.from(threadIds);

  if (threadIdList.length > 0) {
    const { data: posts, error: postsError } = await adminDb
      .from("community_posts")
      .delete()
      .in("thread_id", threadIdList)
      .select("id");

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    deletedPosts = posts?.length ?? 0;

    const { error: threadsError } = await adminDb
      .from("community_threads")
      .delete()
      .in("id", threadIdList);
    if (threadsError) {
      return NextResponse.json({ error: threadsError.message }, { status: 500 });
    }
  }

  for (const user of smokeUsers) {
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
    }

    if (user.email) {
      deletedUserEmails.push(user.email);
    }
  }

  return NextResponse.json({
    ok: true,
    matchedThreads: uniqueMatchedThreads.map((row) => ({ id: row.id, title: row.title })),
    deletedThreads: threadIdList,
    deletedPosts,
    closedIssues,
    skippedIssueClosures,
    matchedUsers: smokeUsers.map((user) => ({ id: user.id, email: user.email ?? null })),
    deletedUserEmails,
  });
}
