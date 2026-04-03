"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useNotificationPreferences } from "@/components/notifications/useNotificationPreferences";
import type { CommunityForumThread } from "@/lib/community/forum";

type ContentKind = "chapter" | "lab";
type CommentType = "feedback" | "correction" | "issue" | "question";

type CommunityComment = {
  id: string;
  content_kind: ContentKind;
  content_slug: string;
  comment_type: CommentType;
  body: string;
  author_name: string;
  created_at: string;
};

type CommunityThreadProps = {
  contentKind: ContentKind;
  contentSlug: string;
  title: string;
  compact?: boolean;
  standaloneSpacing?: boolean;
};

const typeLabels: Record<CommentType, string> = {
  feedback: "General feedback",
  correction: "Technical correction",
  issue: "Lab or UI issue",
  question: "Question",
};

const badgeClasses: Record<CommentType, string> = {
  feedback: "bg-slate-800 text-slate-300",
  correction: "bg-amber-500/15 text-amber-200",
  issue: "bg-rose-500/15 text-rose-200",
  question: "bg-cyan-500/15 text-cyan-200",
};

const COMMENT_TYPE_OPTIONS = ["feedback", "correction", "issue", "question"] as const;

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function CommunityThread({
  contentKind,
  contentSlug,
  title,
  compact = false,
  standaloneSpacing = true,
}: CommunityThreadProps) {
  const { user, loading } = useAuth();
  const { preferences, savePreferences } = useNotificationPreferences(Boolean(user));
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [threads, setThreads] = useState<CommunityForumThread[]>([]);
  const [commentType, setCommentType] = useState<CommentType>("feedback");
  const [threadTitle, setThreadTitle] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [openGitHubIssue, setOpenGitHubIssue] = useState(false);
  const [notifyThreadActivity, setNotifyThreadActivity] = useState(true);
  const [body, setBody] = useState("");
  const [fetching, setFetching] = useState(true);
  const [threadsFetching, setThreadsFetching] = useState(true);
  const [setupPending, setSetupPending] = useState(false);
  const [forumSetupPending, setForumSetupPending] = useState(false);
  const [githubIssueMirrorAvailable, setGitHubIssueMirrorAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [postingThread, setPostingThread] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [threadMessage, setThreadMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setFetching(true);
      setError(null);

      const response = await fetch(
        `/api/community/comments?kind=${contentKind}&slug=${encodeURIComponent(contentSlug)}`,
        {
          cache: "no-store",
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            comments?: CommunityComment[];
            error?: string;
            setupPending?: boolean;
          }
        | null;

      if (!active) {
        return;
      }

      if (!response.ok) {
        setError(payload?.error ?? "Could not load comments.");
        setSetupPending(Boolean(payload?.setupPending));
        setComments([]);
        setFetching(false);
        return;
      }

      setComments(payload?.comments ?? []);
      setSetupPending(Boolean(payload?.setupPending));
      setFetching(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [contentKind, contentSlug]);

  useEffect(() => {
    let active = true;

    async function loadThreads() {
      setThreadsFetching(true);

      const response = await fetch(
        `/api/community/threads?type=${contentKind}&kind=${contentKind}&slug=${encodeURIComponent(contentSlug)}`,
        {
          cache: "no-store",
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            threads?: CommunityForumThread[];
            error?: string;
            setupPending?: boolean;
            githubIssueMirrorAvailable?: boolean;
          }
        | null;

      if (!active) {
        return;
      }

      if (!response.ok) {
        setThreads([]);
        setForumSetupPending(Boolean(payload?.setupPending));
        setThreadsFetching(false);
        if (!error) {
          setError(payload?.error ?? "Could not load tracked discussions.");
        }
        return;
      }

      setThreads(payload?.threads ?? []);
      setForumSetupPending(Boolean(payload?.setupPending));
      setGitHubIssueMirrorAvailable(Boolean(payload?.githubIssueMirrorAvailable));
      setThreadsFetching(false);
    }

    void loadThreads();

    return () => {
      active = false;
    };
  }, [contentKind, contentSlug, error]);

  useEffect(() => {
    if (!preferences) {
      return;
    }

    setNotifyThreadActivity(preferences.notifyThreadActivity);
  }, [preferences]);

  const introCopy = useMemo(
    () =>
      contentKind === "chapter"
        ? "Use this thread for technical corrections, missing nuance, clarity issues, or chapter-level questions."
        : "Use this thread for lab glitches, command realism, solution feedback, or topology-state issues.",
    [contentKind],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (body.trim().length < 12) {
      setError("Comment should be at least 12 characters.");
      return;
    }

    setPosting(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/community/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: contentKind,
        slug: contentSlug,
        commentType,
        body,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          comment?: CommunityComment;
          error?: string;
          message?: string;
          setupPending?: boolean;
        }
      | null;

    setPosting(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not post comment.");
      setSetupPending(Boolean(payload?.setupPending));
      return;
    }

    if (payload?.comment) {
      setComments((current) => [payload.comment!, ...current]);
    }

    setBody("");
    setCommentType("feedback");
    setMessage(payload?.message ?? "Comment posted.");
  }

  async function handleThreadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (threadTitle.trim().length < 6) {
      setError("Discussion subject should be at least 6 characters.");
      return;
    }

    if (threadBody.trim().length < 20) {
      setError("Discussion body should be at least 20 characters.");
      return;
    }

    setPostingThread(true);
    setError(null);
    setThreadMessage(null);

    if (
      user &&
      preferences &&
      (!preferences.hasSavedPreferences || preferences.notifyThreadActivity !== notifyThreadActivity)
    ) {
      const updatedPreferences = await savePreferences({
        notifyThreadActivity,
      });

      if (!updatedPreferences) {
        setPostingThread(false);
        setError("Could not save your reply-notification preference before creating the discussion.");
        return;
      }
    }

    const response = await fetch("/api/community/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        threadType: contentKind,
        contentKind,
        contentSlug,
        title: threadTitle,
        body: threadBody,
        openGitHubIssue,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          thread?: CommunityForumThread;
          error?: string;
          message?: string;
          setupPending?: boolean;
        }
      | null;

    setPostingThread(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not create tracked discussion.");
      setForumSetupPending(Boolean(payload?.setupPending));
      return;
    }

    if (payload?.thread) {
      setThreads((current) => [payload.thread!, ...current]);
    }

    setThreadTitle("");
    setThreadBody("");
    setOpenGitHubIssue(false);
    setThreadMessage(payload?.message ?? "Tracked discussion created.");
  }

  return (
    <section
      className={`rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-slate-950/30 ${
        compact ? "p-4" : `${standaloneSpacing ? "mt-12" : ""} p-6 sm:p-8`
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Community discussion</p>
          <h3 className={`mt-3 font-semibold text-white ${compact ? "text-lg" : "text-2xl"}`}>
            Notes, corrections, and operator feedback
          </h3>
          <p className={`mt-3 max-w-3xl text-slate-400 ${compact ? "text-xs leading-6" : "text-sm leading-7"}`}>
            {introCopy} This thread belongs to <span className="text-slate-200">{title}</span>.
          </p>
        </div>
        <Link
          href="/community"
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          Community hub
        </Link>
      </div>

      {setupPending ? (
        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-7 text-amber-100">
          Community comments are being provisioned. Apply the latest Supabase migration to enable
          public discussion on chapters and labs.
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-7 text-rose-100">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-7 text-emerald-100">
          {message}
        </div>
      ) : null}

      <div className={compact ? "mt-5 space-y-3" : "mt-6 space-y-4"}>
        {fetching ? (
          <div className="rounded-2xl border border-white/8 bg-[#020b16] px-4 py-3 text-sm text-slate-400">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-[#020b16] px-4 py-3 text-sm text-slate-400">
            No comments yet. Be the first to leave a correction, question, or lab note.
          </div>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-2xl border border-white/8 bg-[#020b16] p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] ${badgeClasses[comment.comment_type]}`}>
                  {typeLabels[comment.comment_type]}
                </span>
                <span className="text-xs text-slate-500">{comment.author_name}</span>
                <span className="text-xs text-slate-600">{formatDate(comment.created_at)}</span>
              </div>
              <p className={`mt-3 whitespace-pre-line text-slate-300 ${compact ? "text-xs leading-6" : "text-sm leading-7"}`}>
                {comment.body}
              </p>
            </article>
          ))
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-white/8 bg-[#020b16] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Tracked discussions</p>
            <h4 className="mt-2 text-lg font-semibold text-white">
              Escalate this {contentKind} into a titled thread
            </h4>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
              Use this when a fix needs follow-through, multiple comments, or a matching GitHub issue.
            </p>
          </div>
        </div>

        {forumSetupPending ? (
          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-7 text-amber-100">
            The tracked-discussion forum tables are not provisioned yet. Apply the latest community forum migration first.
          </div>
        ) : null}

        {threadMessage ? (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-7 text-emerald-100">
            {threadMessage}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {threadsFetching ? (
            <div className="rounded-2xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-slate-400">
              Loading tracked discussions...
            </div>
          ) : threads.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-slate-400">
              No tracked discussions yet. Start one when this needs a titled thread or GitHub follow-up.
            </div>
          ) : (
            threads.map((thread) => (
              <article key={thread.id} className="rounded-2xl border border-white/8 bg-slate-950 p-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="rounded-full border border-white/10 px-2.5 py-1 uppercase tracking-[0.24em] text-cyan-300">
                    {contentKind}
                  </span>
                  <span>{thread.author_name}</span>
                  <span>{formatDate(thread.created_at)}</span>
                  <span>{thread.reply_count} repl{thread.reply_count === 1 ? "y" : "ies"}</span>
                </div>
                <h5 className="mt-3 text-base font-semibold text-white">
                  <Link href={`/community/${thread.id}`} className="transition hover:text-cyan-300">
                    {thread.title}
                  </Link>
                </h5>
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-7 text-slate-400">
                  {thread.body}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/community/${thread.id}`}
                    className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 transition hover:border-cyan-500/50 hover:text-cyan-200"
                  >
                    Open discussion
                  </Link>
                  {thread.github_issue_url ? (
                    <a
                      href={thread.github_issue_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                    >
                      GitHub issue
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/8 bg-slate-950 p-4">
          {loading ? (
            <p className="text-sm text-slate-500">Checking session...</p>
          ) : user ? (
            <form className="space-y-4" onSubmit={handleThreadSubmit}>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">
                  Subject
                </span>
                <input
                  value={threadTitle}
                  onChange={(event) => setThreadTitle(event.target.value)}
                  placeholder={`Example: ${contentKind === "chapter" ? "Chapter 5 should cite NVIDIA QoS defaults" : "Lab 8 PFC mismatch flow needs switch-side verification output"}`}
                  className="w-full rounded-2xl border border-white/10 bg-[#020b16] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500/40"
                />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">
                  Opening post
                </span>
                <textarea
                  value={threadBody}
                  onChange={(event) => setThreadBody(event.target.value)}
                  rows={5}
                  placeholder={`Describe the ${contentKind}-specific issue, the expected behavior, and any evidence or sources.`}
                  className="w-full rounded-2xl border border-white/10 bg-[#020b16] px-4 py-3 text-sm leading-7 text-slate-100 outline-none transition focus:border-cyan-500/40"
                />
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-[#020b16] px-4 py-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={openGitHubIssue}
                  onChange={(event) => setOpenGitHubIssue(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                />
                <span>
                  <span className="block font-medium text-slate-200">Also open GitHub issue</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-500">
                    {githubIssueMirrorAvailable
                      ? "Mirror this tracked discussion into the GitHub issue tracker for maintainer follow-up."
                      : "GitHub mirroring is not configured on the server yet, but the thread will still be created here."}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-[#020b16] px-4 py-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={notifyThreadActivity}
                  onChange={(event) => setNotifyThreadActivity(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                />
                <span>
                  <span className="block font-medium text-slate-200">Email me about replies to this discussion</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-500">
                    This keeps your reply-notification preference explicit instead of silently auto-subscribing you.
                  </span>
                </span>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs leading-6 text-slate-500">
                  Use tracked discussions for issues that deserve a durable subject line and replies over time.
                </p>
                <button
                  type="submit"
                  disabled={postingThread}
                  className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {postingThread ? "Creating..." : "Create tracked discussion"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-7 text-slate-400">
                Sign in to open a tracked discussion for this {contentKind} and optionally mirror it to GitHub.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Sign in to start a tracked discussion
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/8 bg-[#020b16] p-4">
        {loading ? (
          <p className="text-sm text-slate-500">Checking session...</p>
        ) : user ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <label className="text-sm text-slate-300">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">
                  Comment type
                </span>
                <select
                  value={commentType}
                  onChange={(event) => setCommentType(event.target.value as CommentType)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500/40"
                >
                  {COMMENT_TYPE_OPTIONS.map((entry) => (
                    <option key={entry} value={entry}>
                      {typeLabels[entry]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">
                  Comment
                </span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={compact ? 4 : 5}
                  placeholder="Describe the technical correction, issue, or question clearly."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-7 text-slate-100 outline-none transition focus:border-cyan-500/40"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-6 text-slate-500">
                Sign-in keeps the discussion attributable and lets us follow up on corrections.
              </p>
              <button
                type="submit"
                disabled={posting}
                className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {posting ? "Posting..." : "Post comment"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-7 text-slate-400">
              Sign in to join the discussion and leave technical corrections or lab feedback.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Sign in to comment
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
