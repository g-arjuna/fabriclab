import { NextResponse } from "next/server";

import { getServerViewer } from "@/lib/auth/server";
import { getSourceCatalogItem, type CatalogKind } from "@/lib/catalog/source";
import { notifyAdminsOfCommunityActivity } from "@/lib/notifications/dispatch";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { getServerSupabaseClient } from "@/lib/supabase/server";

const COMMENT_TYPES = ["feedback", "correction", "issue", "question"] as const;

type CommentType = (typeof COMMENT_TYPES)[number];

type CommentRow = {
  id: string;
  content_kind: CatalogKind;
  content_slug: string;
  comment_type: CommentType;
  body: string;
  author_name: string;
  created_at: string;
  community_comment_replies?: CommentReplyRow[];
};

type CommentReplyRow = {
  id: string;
  comment_id: string;
  body: string;
  author_name: string;
  created_at: string;
};

function isMissingCommentsTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /community_comments/i.test(error.message ?? "") ||
    /community_comment_replies/i.test(error.message ?? "")
  );
}

function parseKind(value: string | null): CatalogKind | null {
  if (value === "chapter" || value === "lab") {
    return value;
  }

  return null;
}

function parseCommentType(value: unknown): CommentType | null {
  if (typeof value !== "string") {
    return null;
  }

  return COMMENT_TYPES.find((entry) => entry === value) ?? null;
}

function deriveAuthorName(input: {
  email: string | null;
  fullName?: unknown;
  name?: unknown;
  displayName?: string | null;
}) {
  if (typeof input.displayName === "string" && input.displayName.trim()) {
    return input.displayName.trim();
  }

  if (typeof input.fullName === "string" && input.fullName.trim()) {
    return input.fullName.trim();
  }

  if (typeof input.name === "string" && input.name.trim()) {
    return input.name.trim();
  }

  if (input.email) {
    return input.email.split("@")[0];
  }

  return "FabricLab learner";
}

function buildContentPath(kind: CatalogKind, slug: string) {
  return kind === "chapter" ? `/learn/${slug}` : `/lab?lab=${encodeURIComponent(slug)}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = parseKind(url.searchParams.get("kind"));
  const slug = url.searchParams.get("slug")?.trim() ?? "";

  if (!kind || !slug) {
    return NextResponse.json({ error: "A valid content kind and slug are required." }, { status: 400 });
  }

  if (!getSourceCatalogItem(kind, slug)) {
    return NextResponse.json({ error: "Content item not found." }, { status: 404 });
  }

  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ enabled: false, setupPending: false, comments: [] satisfies CommentRow[] });
  }

  const [commentsResult, repliesResult] = await Promise.all([
    supabase
      .from("community_comments")
      .select("id, content_kind, content_slug, comment_type, body, author_name, created_at")
      .eq("content_kind", kind)
      .eq("content_slug", slug)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("community_comment_replies")
      .select("id, comment_id, body, author_name, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: true })
      .limit(300),
  ]);

  if (isMissingCommentsTable(commentsResult.error) || isMissingCommentsTable(repliesResult.error)) {
    return NextResponse.json({ enabled: true, setupPending: true, comments: [] satisfies CommentRow[] });
  }

  if (commentsResult.error) {
    return NextResponse.json({ error: commentsResult.error.message }, { status: 500 });
  }

  if (repliesResult.error) {
    return NextResponse.json({ error: repliesResult.error.message }, { status: 500 });
  }

  const repliesByCommentId = new Map<string, CommentReplyRow[]>();
  for (const reply of (repliesResult.data ?? []) as CommentReplyRow[]) {
    const existing = repliesByCommentId.get(reply.comment_id);
    if (existing) {
      existing.push(reply);
    } else {
      repliesByCommentId.set(reply.comment_id, [reply]);
    }
  }

  return NextResponse.json({
    enabled: true,
    setupPending: false,
    comments: ((commentsResult.data ?? []) as CommentRow[]).map((comment) => ({
      ...comment,
      community_comment_replies: repliesByCommentId.get(comment.id) ?? [],
    })),
  });
}

export async function POST(request: Request) {
  const viewer = await getServerViewer();
  if (!viewer.user) {
    return NextResponse.json({ error: "Sign in to post a comment." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { kind?: string; slug?: string; commentType?: string; body?: string }
    | null;

  const kind = parseKind(body?.kind ?? null);
  const slug = body?.slug?.trim() ?? "";
  const commentType = parseCommentType(body?.commentType);
  const commentBody = body?.body?.trim() ?? "";

  if (!kind || !slug || !commentType) {
    return NextResponse.json({ error: "A valid content target and comment type are required." }, { status: 400 });
  }

  if (!getSourceCatalogItem(kind, slug)) {
    return NextResponse.json({ error: "Content item not found." }, { status: 404 });
  }

  if (commentBody.length < 12) {
    return NextResponse.json({ error: "Comment should be at least 12 characters." }, { status: 400 });
  }

  if (commentBody.length > 4000) {
    return NextResponse.json({ error: "Comment is too long." }, { status: 400 });
  }

  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }
  const admin = getAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  }
  const adminDb = admin as any;

  const { data: profile } = await adminDb
    .from("profiles")
    .select("display_name")
    .eq("user_id", viewer.user.id)
    .maybeSingle();

  const authorName = deriveAuthorName({
    email: viewer.email,
    fullName: viewer.user.user_metadata?.full_name,
    name: viewer.user.user_metadata?.name,
    displayName: profile?.display_name ?? null,
  });

  const { data, error } = await adminDb
    .from("community_comments")
    .insert({
      content_kind: kind,
      content_slug: slug,
      user_id: viewer.user.id,
      author_name: authorName,
      author_email: viewer.email,
      comment_type: commentType,
      body: commentBody,
      status: "published",
    })
    .select("id, content_kind, content_slug, comment_type, body, author_name, created_at")
    .single();

  if (isMissingCommentsTable(error)) {
    return NextResponse.json(
      {
        error: "Community comments are not provisioned yet. Apply the latest Supabase migration first.",
        setupPending: true,
      },
      { status: 503 },
    );
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appEnv = getPublicSupabaseEnv();
  if (appEnv) {
    await notifyAdminsOfCommunityActivity({
      actorName: authorName,
      actorEmail: viewer.email,
      event: "content_comment_created",
      subjectLabel: `${kind === "chapter" ? "Chapter" : "Lab"} comment`,
      targetLabel: `${kind === "chapter" ? "Chapter" : "Lab"}: ${getSourceCatalogItem(kind, slug)?.title ?? slug}`,
      targetUrl: `${appEnv.appUrl}${buildContentPath(kind, slug)}`,
      bodyPreview: commentBody,
    }).catch(() => undefined);
  }

  return NextResponse.json({
    message: "Comment posted.",
    comment: data as CommentRow,
  });
}
