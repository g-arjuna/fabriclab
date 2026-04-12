import { getSourceCatalogItem, type CatalogKind } from "@/lib/catalog/source";

type CommentRow = {
  id: string;
  content_kind: CatalogKind;
  content_slug: string;
  comment_type: "feedback" | "correction" | "issue" | "question";
  body: string;
  author_name: string;
  created_at: string;
};

type CommentReplyRow = {
  id: string;
  comment_id: string;
  body: string;
  author_name: string;
  created_at: string;
};

type ThreadRow = {
  id: string;
  thread_type: "general" | "chapter" | "lab";
  content_kind: CatalogKind | null;
  content_slug: string | null;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
};

type ThreadPostRow = {
  id: string;
  thread_id: string;
  body: string;
  author_name: string;
  created_at: string;
};

export type CommunityActivityItem = {
  id: string;
  createdAt: string;
  authorName: string;
  type:
    | "content_comment"
    | "content_comment_reply"
    | "tracked_discussion"
    | "tracked_discussion_reply"
    | "general_thread"
    | "general_thread_reply";
  title: string;
  body: string;
  href: string;
  targetLabel: string;
};

type CommunityActivityCounts = {
  comments: number;
  commentReplies: number;
  trackedThreads: number;
  trackedReplies: number;
  generalThreads: number;
  generalReplies: number;
};

export type CommunityActivityFeed = {
  counts: CommunityActivityCounts;
  items: CommunityActivityItem[];
};

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

function buildContentHref(kind: CatalogKind, slug: string) {
  return kind === "chapter" ? `/learn/${slug}` : `/lab?lab=${encodeURIComponent(slug)}`;
}

function buildContentLabel(kind: CatalogKind, slug: string) {
  const item = getSourceCatalogItem(kind, slug);
  const fallback = kind === "chapter" ? "Chapter" : "Lab";
  return item ? `${fallback}: ${item.title}` : `${fallback}: ${slug}`;
}

function buildThreadLabel(thread: {
  thread_type: "general" | "chapter" | "lab";
  content_kind: CatalogKind | null;
  content_slug: string | null;
  title: string;
}) {
  if (thread.thread_type === "general") {
    return `General forum: ${thread.title}`;
  }

  if (thread.content_kind && thread.content_slug) {
    return `Tracked ${thread.thread_type}: ${buildContentLabel(thread.content_kind, thread.content_slug)}`;
  }

  return `Tracked ${thread.thread_type}: ${thread.title}`;
}

function buildThreadHref(thread: {
  id: string;
  thread_type: "general" | "chapter" | "lab";
}) {
  return `/community/${thread.id}`;
}

export function isMissingCommunityActivityTables(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /relation .*community_comments.* does not exist/i.test(error.message ?? "") ||
    /relation .*community_comment_replies.* does not exist/i.test(error.message ?? "") ||
    /relation .*community_threads.* does not exist/i.test(error.message ?? "") ||
    /relation .*community_posts.* does not exist/i.test(error.message ?? "")
  );
}

export async function listRecentCommunityActivity(admin: any, limit = 80): Promise<CommunityActivityFeed> {
  const adminDb = admin as any;

  const [commentsResult, commentRepliesResult, threadsResult, postsResult] = await Promise.all([
    adminDb
      .from("community_comments")
      .select("id, content_kind, content_slug, comment_type, body, author_name, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit),
    adminDb
      .from("community_comment_replies")
      .select("id, comment_id, body, author_name, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit),
    adminDb
      .from("community_threads")
      .select("id, thread_type, content_kind, content_slug, title, body, author_name, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit),
    adminDb
      .from("community_posts")
      .select("id, thread_id, body, author_name, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const firstError =
    commentsResult.error ??
    commentRepliesResult.error ??
    threadsResult.error ??
    postsResult.error ??
    null;

  if (firstError) {
    throw firstError;
  }

  const commentItems = ((commentsResult.data ?? []) as CommentRow[]).map((comment) => ({
    id: `comment:${comment.id}`,
    createdAt: comment.created_at,
    authorName: comment.author_name,
    type: "content_comment" as const,
    title: `New ${comment.comment_type} comment`,
    body: comment.body,
    href: buildContentHref(comment.content_kind, comment.content_slug),
    targetLabel: buildContentLabel(comment.content_kind, comment.content_slug),
  }));

  const commentMap = new Map(((commentsResult.data ?? []) as CommentRow[]).map((comment) => [comment.id, comment]));

  const commentReplyItems = ((commentRepliesResult.data ?? []) as CommentReplyRow[])
    .map((reply) => {
      const parentComment = commentMap.get(reply.comment_id) ?? null;
      if (!parentComment) {
        return null;
      }

      return {
        id: `comment-reply:${reply.id}`,
        createdAt: reply.created_at,
        authorName: reply.author_name,
        type: "content_comment_reply" as const,
        title: `Reply to ${parentComment.author_name}'s comment`,
        body: reply.body,
        href: buildContentHref(parentComment.content_kind, parentComment.content_slug),
        targetLabel: buildContentLabel(parentComment.content_kind, parentComment.content_slug),
      };
    })
    .filter(isDefined);

  const threadItems = ((threadsResult.data ?? []) as ThreadRow[]).map((thread) => ({
    id: `thread:${thread.id}`,
    createdAt: thread.created_at,
    authorName: thread.author_name,
    type:
      thread.thread_type === "general"
        ? ("general_thread" as const)
        : ("tracked_discussion" as const),
    title: thread.title,
    body: thread.body,
    href: buildThreadHref(thread),
    targetLabel: buildThreadLabel(thread),
  }));

  const threadMap = new Map(((threadsResult.data ?? []) as ThreadRow[]).map((thread) => [thread.id, thread]));

  const threadReplyItems = ((postsResult.data ?? []) as ThreadPostRow[])
    .map((post) => {
      const parentThread = threadMap.get(post.thread_id) ?? null;
      if (!parentThread) {
        return null;
      }

      return {
        id: `thread-post:${post.id}`,
        createdAt: post.created_at,
        authorName: post.author_name,
        type:
          parentThread.thread_type === "general"
            ? ("general_thread_reply" as const)
            : ("tracked_discussion_reply" as const),
        title: `Reply in ${parentThread.title}`,
        body: post.body,
        href: buildThreadHref(parentThread),
        targetLabel: buildThreadLabel(parentThread),
      };
    })
    .filter(isDefined);

  const items = [
    ...commentItems,
    ...commentReplyItems,
    ...threadItems,
    ...threadReplyItems,
  ]
    .filter(isDefined)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);

  return {
    counts: {
      comments: commentItems.length,
      commentReplies: commentReplyItems.length,
      trackedThreads: threadItems.filter((item) => item.type === "tracked_discussion").length,
      trackedReplies: threadReplyItems.filter((item) => item.type === "tracked_discussion_reply").length,
      generalThreads: threadItems.filter((item) => item.type === "general_thread").length,
      generalReplies: threadReplyItems.filter((item) => item.type === "general_thread_reply").length,
    },
    items,
  };
}
