import { getPublicCommunityConfig } from "@/lib/community/config";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

type GitHubIssueTarget = {
  owner: string;
  repo: string;
};

type CreateGitHubIssueInput = {
  title: string;
  body: string;
  authorName: string;
  threadUrl: string;
};

type CreateGitHubIssueResult =
  | { ok: true; issueUrl: string; issueNumber: number }
  | { ok: false; error: string };

function parseGitHubRepoUrl(value: string | null): GitHubIssueTarget | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.hostname !== "github.com") {
      return null;
    }

    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) {
      return null;
    }

    return {
      owner,
      repo: repo.replace(/\.git$/i, ""),
    };
  } catch {
    return null;
  }
}

function getIssueTarget(): GitHubIssueTarget | null {
  return parseGitHubRepoUrl(getPublicCommunityConfig().repoUrl);
}

function getIssueLabels(): string[] {
  return (process.env.GITHUB_COMMUNITY_ISSUE_LABELS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isGitHubIssueMirrorConfigured() {
  return Boolean(process.env.GITHUB_COMMUNITY_ISSUES_TOKEN?.trim() && getIssueTarget());
}

export function getGitHubIssueMirrorPublicAvailability() {
  return Boolean(getPublicCommunityConfig().issuesUrl);
}

export async function createGitHubIssueFromThread(
  input: CreateGitHubIssueInput,
): Promise<CreateGitHubIssueResult> {
  const token = process.env.GITHUB_COMMUNITY_ISSUES_TOKEN?.trim();
  const target = getIssueTarget();
  const appEnv = getPublicSupabaseEnv();

  if (!token || !target || !appEnv) {
    return {
      ok: false,
      error: "GitHub issue mirroring is not configured yet.",
    };
  }

  const issueBody = [
    input.body.trim(),
    "",
    "---",
    `Reported by: ${input.authorName}`,
    `FabricLab thread: ${input.threadUrl}`,
    `Site: ${appEnv.appUrl}`,
  ].join("\n");

  const response = await fetch(`https://api.github.com/repos/${target.owner}/${target.repo}/issues`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      body: issueBody,
      labels: getIssueLabels(),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    return {
      ok: false,
      error: payload?.message ?? "GitHub issue creation failed.",
    };
  }

  const payload = (await response.json()) as { html_url: string; number: number };

  return {
    ok: true,
    issueUrl: payload.html_url,
    issueNumber: payload.number,
  };
}
