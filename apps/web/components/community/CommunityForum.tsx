"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useNotificationPreferences } from "@/components/notifications/useNotificationPreferences";
import type { CommunityForumThread } from "@/lib/community/forum";

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

function ThreadCard({ thread }: { thread: CommunityForumThread }) {
  return (
    <article className="rounded-[1.5rem] border border-white/8 bg-[#020b16] p-5 transition hover:border-white/15">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="rounded-full border border-white/10 px-2.5 py-1 uppercase tracking-[0.24em] text-cyan-300">
          General
        </span>
        <span>{thread.author_name}</span>
        <span>{formatDate(thread.created_at)}</span>
        <span>{thread.reply_count} repl{thread.reply_count === 1 ? "y" : "ies"}</span>
      </div>
      <h3 className="mt-4 text-xl font-semibold text-white">
        <Link href={`/community/${thread.id}`} className="transition hover:text-cyan-300">
          {thread.title}
        </Link>
      </h3>
      <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-7 text-slate-400">
        {thread.body}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={`/community/${thread.id}`}
          className="inline-flex items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 transition hover:border-cyan-500/50 hover:text-cyan-200"
        >
          Open discussion
        </Link>
        {thread.github_issue_url ? (
          <a
            href={thread.github_issue_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            GitHub issue
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function CommunityForum() {
  const { user, loading } = useAuth();
  const { preferences, savePreferences } = useNotificationPreferences(Boolean(user));
  const [threads, setThreads] = useState<CommunityForumThread[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openGitHubIssue, setOpenGitHubIssue] = useState(false);
  const [notifyThreadActivity, setNotifyThreadActivity] = useState(true);
  const [fetching, setFetching] = useState(true);
  const [setupPending, setSetupPending] = useState(false);
  const [githubIssueMirrorAvailable, setGitHubIssueMirrorAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setFetching(true);
      setError(null);

      const response = await fetch("/api/community/threads?type=general", {
        cache: "no-store",
      });

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
        setError(payload?.error ?? "Could not load community discussions.");
        setSetupPending(Boolean(payload?.setupPending));
        setThreads([]);
        setFetching(false);
        return;
      }

      setThreads(payload?.threads ?? []);
      setSetupPending(Boolean(payload?.setupPending));
      setGitHubIssueMirrorAvailable(Boolean(payload?.githubIssueMirrorAvailable));
      setFetching(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!preferences) {
      return;
    }

    setNotifyThreadActivity(preferences.notifyThreadActivity);
  }, [preferences]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (title.trim().length < 6) {
      setError("Thread title should be at least 6 characters.");
      return;
    }

    if (body.trim().length < 20) {
      setError("Opening post should be at least 20 characters.");
      return;
    }

    setPosting(true);
    setError(null);
    setMessage(null);

    if (
      user &&
      preferences &&
      (!preferences.hasSavedPreferences || preferences.notifyThreadActivity !== notifyThreadActivity)
    ) {
      const updatedPreferences = await savePreferences({
        notifyThreadActivity,
      });

      if (!updatedPreferences) {
        setPosting(false);
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
        threadType: "general",
        title,
        body,
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

    setPosting(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not create discussion.");
      setSetupPending(Boolean(payload?.setupPending));
      return;
    }

    if (payload?.thread) {
      setThreads((current) => [payload.thread!, ...current]);
    }

    setTitle("");
    setBody("");
    setOpenGitHubIssue(false);
    setMessage(payload?.message ?? "Discussion created.");
  }

  return (
    <section className="mt-14 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[1.9rem] border border-white/10 bg-slate-900/70 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">General forum</p>
        <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
          Discuss the platform beyond one page
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          Start broader conversations here when the topic spans multiple chapters or labs: roadmap
          ideas, missing concepts, realism gaps, onboarding pain points, or architectural
          suggestions for FabricLab itself.
        </p>

        {setupPending ? (
          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-7 text-amber-100">
            The general forum tables are not provisioned yet. Apply the latest Supabase community
            forum migration first.
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

        <div className="mt-6 space-y-4">
          {fetching ? (
            <div className="rounded-2xl border border-white/8 bg-[#020b16] px-4 py-3 text-sm text-slate-400">
              Loading discussions...
            </div>
          ) : threads.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-[#020b16] px-4 py-3 text-sm text-slate-400">
              No general discussions yet. Start the first one.
            </div>
          ) : (
            threads.map((thread) => <ThreadCard key={thread.id} thread={thread} />)
          )}
        </div>
      </div>

      <div className="rounded-[1.9rem] border border-white/10 bg-slate-900/70 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Start a thread</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Open a broader discussion</h2>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          Use a clear subject line so we can later mirror the best discussions into GitHub issues or
          discussion boards without rewriting context.
        </p>

        <div className="mt-6 rounded-2xl border border-white/8 bg-[#020b16] p-4">
          {loading ? (
            <p className="text-sm text-slate-500">Checking session...</p>
          ) : user ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">
                  Subject
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Missing vendor references in Chapter 5"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500/40"
                />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">
                  Opening post
                </span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={7}
                  placeholder="Describe the idea, issue, or missing capability clearly enough for maintainers and operators to react."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-7 text-slate-100 outline-none transition focus:border-cyan-500/40"
                />
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
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
                        ? "If enabled, FabricLab will mirror this discussion into the GitHub issue tracker for easier maintainer follow-up."
                      : "The issue tracker is linked publicly, but automatic GitHub issue mirroring is not configured on the server yet."}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={notifyThreadActivity}
                  onChange={(event) => setNotifyThreadActivity(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                />
                  <span>
                    <span className="block font-medium text-slate-200">
                      Email me about replies to this discussion
                    </span>
                    <span className="mt-1 block text-xs leading-6 text-slate-500">
                      This updates your FabricLab discussion-reply notification preference for future threads too.
                    </span>
                  </span>
                </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-6 text-slate-500">
                  Keep titles specific so the same thread can become an actionable issue without being renamed.
                </p>
                <button
                  type="submit"
                  disabled={posting}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {posting ? "Creating..." : "Create thread"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-7 text-slate-400">
                Sign in to start a discussion, keep feedback attributable, and help us turn the best
                reports into actionable fixes.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Sign in to start a thread
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
