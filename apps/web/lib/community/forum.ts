import type { CatalogKind } from "@/lib/catalog/source";

export const COMMUNITY_THREAD_TYPES = ["general", "chapter", "lab"] as const;

export type CommunityThreadType = (typeof COMMUNITY_THREAD_TYPES)[number];

export type CommunityForumThread = {
  id: string;
  thread_type: CommunityThreadType;
  content_kind: CatalogKind | null;
  content_slug: string | null;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
  github_issue_url: string | null;
  reply_count: number;
};

export type CommunityForumPost = {
  id: string;
  thread_id: string;
  body: string;
  author_name: string;
  created_at: string;
};

export function parseCommunityThreadType(value: unknown): CommunityThreadType | null {
  if (typeof value !== "string") {
    return null;
  }

  return COMMUNITY_THREAD_TYPES.find((entry) => entry === value) ?? null;
}

export function isMissingCommunityTables(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    /relation .*community_threads.* does not exist/i.test(error.message ?? "") ||
    /relation .*community_posts.* does not exist/i.test(error.message ?? "")
  );
}

export function deriveCommunityAuthorName(input: {
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
