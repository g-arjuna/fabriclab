function normaliseOptionalUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

export type PublicCommunityConfig = {
  repoUrl: string | null;
  issuesUrl: string | null;
  discussionsUrl: string | null;
  supportUrl: string | null;
};

export function getPublicCommunityConfig(): PublicCommunityConfig {
  return {
    repoUrl: normaliseOptionalUrl(process.env.NEXT_PUBLIC_COMMUNITY_REPO_URL),
    issuesUrl: normaliseOptionalUrl(process.env.NEXT_PUBLIC_COMMUNITY_ISSUES_URL),
    discussionsUrl: normaliseOptionalUrl(process.env.NEXT_PUBLIC_COMMUNITY_DISCUSSIONS_URL),
    supportUrl: normaliseOptionalUrl(process.env.NEXT_PUBLIC_SUPPORT_URL),
  };
}

