"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

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
}: CommunityThreadProps) {
  const { user, loading } = useAuth();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentType, setCommentType] = useState<CommentType>("feedback");
  const [body, setBody] = useState("");
  const [fetching, setFetching] = useState(true);
  const [setupPending, setSetupPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <section
      className={`rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-slate-950/30 ${
        compact ? "p-4" : "mt-12 p-6 sm:p-8"
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
