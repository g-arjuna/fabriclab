"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { CommunityForumPost, CommunityForumThread } from "@/lib/community/forum";

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

export function CommunityForumThreadView({ threadId }: { threadId: string }) {
  const { user, loading } = useAuth();
  const [thread, setThread] = useState<CommunityForumThread | null>(null);
  const [posts, setPosts] = useState<CommunityForumPost[]>([]);
  const [body, setBody] = useState("");
  const [fetching, setFetching] = useState(true);
  const [setupPending, setSetupPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setFetching(true);
      setError(null);

      const response = await fetch(`/api/community/threads/${threadId}`, {
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            thread?: CommunityForumThread | null;
            posts?: CommunityForumPost[];
            error?: string;
            setupPending?: boolean;
          }
        | null;

      if (!active) {
        return;
      }

      if (!response.ok) {
        setError(payload?.error ?? "Could not load thread.");
        setSetupPending(Boolean(payload?.setupPending));
        setThread(null);
        setPosts([]);
        setFetching(false);
        return;
      }

      setThread(payload?.thread ?? null);
      setPosts(payload?.posts ?? []);
      setSetupPending(Boolean(payload?.setupPending));
      setFetching(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [threadId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (body.trim().length < 12) {
      setError("Reply should be at least 12 characters.");
      return;
    }

    setPosting(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/community/threads/${threadId}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          post?: CommunityForumPost;
          error?: string;
          message?: string;
          setupPending?: boolean;
        }
      | null;

    setPosting(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not post reply.");
      setSetupPending(Boolean(payload?.setupPending));
      return;
    }

    if (payload?.post) {
      setPosts((current) => [...current, payload.post!]);
      setThread((current) =>
        current
          ? {
              ...current,
              reply_count: current.reply_count + 1,
            }
          : current,
      );
    }

    setBody("");
    setMessage(payload?.message ?? "Reply posted.");
  }

  if (fetching) {
    return (
      <section className="rounded-[1.9rem] border border-white/10 bg-slate-900/70 p-6 text-slate-400 sm:p-8">
        Loading discussion...
      </section>
    );
  }

  if (setupPending) {
    return (
      <section className="rounded-[1.9rem] border border-amber-500/20 bg-amber-500/10 p-6 text-amber-100 sm:p-8">
        The general forum tables are not provisioned yet. Apply the latest Supabase community forum
        migration first.
      </section>
    );
  }

  if (error && !thread) {
    return (
      <section className="rounded-[1.9rem] border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100 sm:p-8">
        {error}
      </section>
    );
  }

  if (!thread) {
    return (
      <section className="rounded-[1.9rem] border border-white/10 bg-slate-900/70 p-6 text-slate-300 sm:p-8">
        Thread not found.
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[1.9rem] border border-white/10 bg-slate-900/70 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full border border-white/10 px-2.5 py-1 uppercase tracking-[0.24em] text-cyan-300">
            {thread.thread_type === "general" ? "General discussion" : thread.thread_type}
          </span>
          <span>{thread.author_name}</span>
          <span>{formatDate(thread.created_at)}</span>
          <span>{thread.reply_count} repl{thread.reply_count === 1 ? "y" : "ies"}</span>
        </div>
        {thread.thread_type !== "general" && thread.content_slug ? (
          <div className="mt-4">
            <Link
              href={
                thread.thread_type === "chapter"
                  ? `/learn/${thread.content_slug}`
                  : `/lab?lab=${encodeURIComponent(thread.content_slug)}`
              }
              className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Back to source {thread.thread_type}
            </Link>
          </div>
        ) : null}
        <h1 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">{thread.title}</h1>
        <p className="mt-5 whitespace-pre-line text-base leading-8 text-slate-300">{thread.body}</p>
        {thread.github_issue_url ? (
          <div className="mt-6">
            <a
              href={thread.github_issue_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 transition hover:border-cyan-500/50 hover:text-cyan-200"
            >
              Open linked GitHub issue
            </a>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.9rem] border border-white/10 bg-slate-900/70 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Replies</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Continue the discussion</h2>
          </div>
          <Link
            href="/community"
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Back to community
          </Link>
        </div>

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

        <div className="mt-6 space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-[#020b16] px-4 py-3 text-sm text-slate-400">
              No replies yet. Add the first follow-up.
            </div>
          ) : (
            posts.map((post) => (
              <article key={post.id} className="rounded-2xl border border-white/8 bg-[#020b16] p-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{post.author_name}</span>
                  <span>{formatDate(post.created_at)}</span>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-300">{post.body}</p>
              </article>
            ))
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/8 bg-[#020b16] p-4">
          {loading ? (
            <p className="text-sm text-slate-500">Checking session...</p>
          ) : user ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">
                  Reply
                </span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={5}
                  placeholder="Add technical detail, context, or a follow-up question."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-7 text-slate-100 outline-none transition focus:border-cyan-500/40"
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-6 text-slate-500">
                  Keep replies concrete so they can later be promoted into documentation or issue tracking.
                </p>
                <button
                  type="submit"
                  disabled={posting}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {posting ? "Posting..." : "Post reply"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-7 text-slate-400">
                Sign in to reply and keep the discussion attributable.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Sign in to reply
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
