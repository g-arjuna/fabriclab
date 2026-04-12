import { getSourceCatalogItem, type CatalogKind } from "@/lib/catalog/source";

export const COMMUNITY_ACTIVITY_TYPES = [
  "content_comment",
  "content_comment_reply",
  "tracked_discussion",
  "tracked_discussion_reply",
  "general_thread",
  "general_thread_reply",
] as const;

export type CommunityActivityType = (typeof COMMUNITY_ACTIVITY_TYPES)[number];
export type CommunityActivityFilter = "open" | "reviewed" | "all";

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
  parent_reply_id: string | null;
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
  activityId: string;
  createdAt: string;
  authorName: string;
  type: CommunityActivityType;
  title: string;
  body: string;
  href: string;
  targetLabel: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  isReviewed: boolean;
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
  reviewControlsReady: boolean;
};

type CommunityActivityReviewRow = {
  activity_type: CommunityActivityType;
  activity_id: string;
  reviewed_at: string;
  reviewed_by_name: string | null;
};

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

function buildActivityKey(type: CommunityActivityType, activityId: string) {
  return `${type}:${activityId}`;
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

export function isMissingCommunityActivityReviewsTable(
  error: { code?: string; message?: string } | null | undefined,
) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /relation .*community_activity_reviews.* does not exist/i.test(error.message ?? "") ||
    /community_activity_reviews/i.test(error.message ?? "")
  );
}

export function parseCommunityActivityFilter(value: string | null | undefined): CommunityActivityFilter {
  if (value === "reviewed" || value === "all") {
    return value;
  }

  return "open";
}

export function filterCommunityActivityItems(
  items: CommunityActivityItem[],
  filter: CommunityActivityFilter,
) {
  if (filter === "all") {
    return items;
  }

  if (filter === "reviewed") {
    return items.filter((item) => item.isReviewed);
  }

  return items.filter((item) => !item.isReviewed);
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
      .select("id, comment_id, parent_reply_id, body, author_name, created_at")
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

  const recentComments = (commentsResult.data ?? []) as CommentRow[];
  const recentReplies = (commentRepliesResult.data ?? []) as CommentReplyRow[];
  const replyCommentIds = Array.from(new Set(recentReplies.map((reply) => reply.comment_id)));
  const missingCommentIds = replyCommentIds.filter((commentId) => !recentComments.some((comment) => comment.id === commentId));

  let relatedComments = recentComments;
  if (missingCommentIds.length > 0) {
    const { data: missingComments, error: missingCommentsError } = await adminDb
      .from("community_comments")
      .select("id, content_kind, content_slug, comment_type, body, author_name, created_at")
      .in("id", missingCommentIds);

    if (missingCommentsError) {
      throw missingCommentsError;
    }

    relatedComments = [...recentComments, ...((missingComments ?? []) as CommentRow[])];
  }

  const commentItems = recentComments.map((comment) => ({
    id: `comment:${comment.id}`,
    activityId: comment.id,
    createdAt: comment.created_at,
    authorName: comment.author_name,
    type: "content_comment" as const,
    title: `New ${comment.comment_type} comment`,
    body: comment.body,
    href: buildContentHref(comment.content_kind, comment.content_slug),
    targetLabel: buildContentLabel(comment.content_kind, comment.content_slug),
  }));

  const commentMap = new Map(relatedComments.map((comment) => [comment.id, comment]));
  const replyMap = new Map(recentReplies.map((reply) => [reply.id, reply]));

  const commentReplyItems = recentReplies
    .map((reply) => {
      const parentComment = commentMap.get(reply.comment_id) ?? null;
      if (!parentComment) {
        return null;
      }

      const parentReply = reply.parent_reply_id ? replyMap.get(reply.parent_reply_id) ?? null : null;

      return {
        id: `comment-reply:${reply.id}`,
        activityId: reply.id,
        createdAt: reply.created_at,
        authorName: reply.author_name,
        type: "content_comment_reply" as const,
        title: parentReply
          ? `Reply to ${parentReply.author_name}'s reply`
          : `Reply to ${parentComment.author_name}'s comment`,
        body: reply.body,
        href: buildContentHref(parentComment.content_kind, parentComment.content_slug),
        targetLabel: buildContentLabel(parentComment.content_kind, parentComment.content_slug),
      };
    })
    .filter(isDefined);

  const threadItems = ((threadsResult.data ?? []) as ThreadRow[]).map((thread) => ({
    id: `thread:${thread.id}`,
    activityId: thread.id,
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
        activityId: post.id,
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

  let reviewControlsReady = true;
  const reviewsByKey = new Map<string, CommunityActivityReviewRow>();

  if (items.length > 0) {
    const reviewTypes = Array.from(new Set(items.map((item) => item.type)));
    const reviewIds = Array.from(new Set(items.map((item) => item.activityId)));
    const { data: reviews, error: reviewsError } = await adminDb
      .from("community_activity_reviews")
      .select("activity_type, activity_id, reviewed_at, reviewed_by_name")
      .in("activity_type", reviewTypes)
      .in("activity_id", reviewIds);

    if (reviewsError) {
      if (isMissingCommunityActivityReviewsTable(reviewsError)) {
        reviewControlsReady = false;
      } else {
        throw reviewsError;
      }
    } else {
      for (const review of (reviews ?? []) as CommunityActivityReviewRow[]) {
        reviewsByKey.set(buildActivityKey(review.activity_type, review.activity_id), review);
      }
    }
  }

  return {
    counts: {
      comments: commentItems.length,
      commentReplies: commentReplyItems.length,
      trackedThreads: threadItems.filter((item) => item.type === "tracked_discussion").length,
      trackedReplies: threadReplyItems.filter((item) => item.type === "tracked_discussion_reply").length,
      generalThreads: threadItems.filter((item) => item.type === "general_thread").length,
      generalReplies: threadReplyItems.filter((item) => item.type === "general_thread_reply").length,
    },
    items: items.map((item) => {
      const review = reviewsByKey.get(buildActivityKey(item.type, item.activityId));

      return {
        ...item,
        reviewedAt: review?.reviewed_at ?? null,
        reviewedByName: review?.reviewed_by_name ?? null,
        isReviewed: Boolean(review),
      };
    }),
    reviewControlsReady,
  };
}

export async function markCommunityActivityReviewed(
  admin: any,
  input: {
    activityType: CommunityActivityType;
    activityId: string;
    reviewerUserId: string;
    reviewerName: string | null;
  },
) {
  const adminDb = admin as any;
  const { error } = await adminDb.from("community_activity_reviews").upsert(
    {
      activity_type: input.activityType,
      activity_id: input.activityId,
      reviewed_by_user_id: input.reviewerUserId,
      reviewed_by_name: input.reviewerName,
      reviewed_at: new Date().toISOString(),
    },
    {
      onConflict: "activity_type,activity_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    throw error;
  }
}

export async function clearCommunityActivityReviewed(
  admin: any,
  input: {
    activityType: CommunityActivityType;
    activityId: string;
  },
) {
  const adminDb = admin as any;
  const { error } = await adminDb
    .from("community_activity_reviews")
    .delete()
    .eq("activity_type", input.activityType)
    .eq("activity_id", input.activityId);

  if (error) {
    throw error;
  }
}

async function listReplyCascadeIds(adminDb: any, replyId: string) {
  const { data: rootReply, error: rootError } = await adminDb
    .from("community_comment_replies")
    .select("id, comment_id")
    .eq("id", replyId)
    .maybeSingle();

  if (rootError) {
    throw rootError;
  }

  if (!rootReply?.comment_id) {
    return [replyId];
  }

  const { data: relatedReplies, error: relatedError } = await adminDb
    .from("community_comment_replies")
    .select("id, parent_reply_id")
    .eq("comment_id", rootReply.comment_id);

  if (relatedError) {
    throw relatedError;
  }

  const childrenByParent = new Map<string, string[]>();
  for (const reply of (relatedReplies ?? []) as Array<{ id: string; parent_reply_id: string | null }>) {
    if (!reply.parent_reply_id) {
      continue;
    }

    const existing = childrenByParent.get(reply.parent_reply_id) ?? [];
    existing.push(reply.id);
    childrenByParent.set(reply.parent_reply_id, existing);
  }

  const queue = [replyId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    for (const childId of childrenByParent.get(current) ?? []) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  return Array.from(visited);
}

export async function hideCommunityActivity(
  admin: any,
  input: {
    activityType: CommunityActivityType;
    activityId: string;
  },
) {
  const adminDb = admin as any;

  switch (input.activityType) {
    case "content_comment": {
      const { error: repliesError } = await adminDb
        .from("community_comment_replies")
        .update({ status: "hidden" })
        .eq("comment_id", input.activityId);
      if (repliesError) {
        throw repliesError;
      }

      const { error } = await adminDb
        .from("community_comments")
        .update({ status: "hidden" })
        .eq("id", input.activityId);
      if (error) {
        throw error;
      }
      return;
    }
    case "content_comment_reply": {
      const replyIds = await listReplyCascadeIds(adminDb, input.activityId);
      const { error } = await adminDb
        .from("community_comment_replies")
        .update({ status: "hidden" })
        .in("id", replyIds);
      if (error) {
        throw error;
      }
      return;
    }
    case "tracked_discussion":
    case "general_thread": {
      const { error: postsError } = await adminDb
        .from("community_posts")
        .update({ status: "hidden" })
        .eq("thread_id", input.activityId);
      if (postsError) {
        throw postsError;
      }

      const { error } = await adminDb
        .from("community_threads")
        .update({ status: "hidden" })
        .eq("id", input.activityId);
      if (error) {
        throw error;
      }
      return;
    }
    case "tracked_discussion_reply":
    case "general_thread_reply": {
      const { error } = await adminDb
        .from("community_posts")
        .update({ status: "hidden" })
        .eq("id", input.activityId);
      if (error) {
        throw error;
      }
      return;
    }
    default: {
      const exhaustiveCheck: never = input.activityType;
      return exhaustiveCheck;
    }
  }
}
