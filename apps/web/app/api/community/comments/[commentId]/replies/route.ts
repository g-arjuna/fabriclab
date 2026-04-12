import { NextResponse } from "next/server";

import { getServerViewer } from "@/lib/auth/server";
import { getSourceCatalogItem, type CatalogKind } from "@/lib/catalog/source";
import { notifyAdminsOfCommunityActivity } from "@/lib/notifications/dispatch";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { getServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ commentId: string }>;
};

type CommentReplyRow = {
  id: string;
  comment_id: string;
  body: string;
  author_name: string;
  created_at: string;
};

function isMissingCommentReplyTables(error: { code?: string; message?: string } | null | undefined) {
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

export async function POST(request: Request, { params }: RouteContext) {
  const viewer = await getServerViewer();
  if (!viewer.user) {
    return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
  }

  const { commentId } = await params;
  const payload = (await request.json().catch(() => null)) as { body?: string } | null;
  const body = payload?.body?.trim() ?? "";

  if (body.length < 12 || body.length > 4000) {
    return NextResponse.json({ error: "Reply should be between 12 and 4000 characters." }, { status: 400 });
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

  const [{ data: parentComment, error: parentError }, { data: profile }] = await Promise.all([
    supabase
      .from("community_comments")
      .select("id, content_kind, content_slug, author_name")
      .eq("id", commentId)
      .eq("status", "published")
      .maybeSingle(),
    adminDb.from("profiles").select("display_name").eq("user_id", viewer.user.id).maybeSingle(),
  ]);

  if (isMissingCommentReplyTables(parentError)) {
    return NextResponse.json(
      {
        error: "Community comments are not provisioned yet. Apply the latest Supabase migration first.",
        setupPending: true,
      },
      { status: 503 },
    );
  }

  if (parentError) {
    return NextResponse.json({ error: parentError.message }, { status: 500 });
  }

  if (!parentComment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  if (!getSourceCatalogItem(parentComment.content_kind, parentComment.content_slug)) {
    return NextResponse.json({ error: "Content item not found." }, { status: 404 });
  }

  const authorName = deriveAuthorName({
    email: viewer.email,
    fullName: viewer.user.user_metadata?.full_name,
    name: viewer.user.user_metadata?.name,
    displayName: profile?.display_name ?? null,
  });

  const { data, error } = await adminDb
    .from("community_comment_replies")
    .insert({
      comment_id: commentId,
      user_id: viewer.user.id,
      author_name: authorName,
      author_email: viewer.email,
      body,
      status: "published",
    })
    .select("id, comment_id, body, author_name, created_at")
    .single();

  if (isMissingCommentReplyTables(error)) {
    return NextResponse.json(
      {
        error: "Community comment replies are not provisioned yet. Apply the latest Supabase migration first.",
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
      event: "content_comment_replied",
      subjectLabel: `Reply to ${parentComment.author_name}'s comment`,
      targetLabel: `${parentComment.content_kind === "chapter" ? "Chapter" : "Lab"}: ${getSourceCatalogItem(parentComment.content_kind, parentComment.content_slug)?.title ?? parentComment.content_slug}`,
      targetUrl: `${appEnv.appUrl}${buildContentPath(parentComment.content_kind, parentComment.content_slug)}`,
      bodyPreview: body,
    }).catch(() => undefined);
  }

  return NextResponse.json({
    message: "Reply posted.",
    reply: data as CommentReplyRow,
  });
}
