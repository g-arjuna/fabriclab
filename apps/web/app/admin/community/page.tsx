import Link from "next/link";
import { redirect } from "next/navigation";

import {
  isMissingCommunityActivityTables,
  listRecentCommunityActivity,
  type CommunityActivityItem,
} from "@/lib/community/admin";
import { requireAdminViewer } from "@/lib/auth/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getBadgeLabel(type: CommunityActivityItem["type"]) {
  switch (type) {
    case "content_comment":
      return "Comment";
    case "content_comment_reply":
      return "Comment reply";
    case "tracked_discussion":
      return "Tracked discussion";
    case "tracked_discussion_reply":
      return "Tracked reply";
    case "general_thread":
      return "General thread";
    case "general_thread_reply":
      return "General reply";
    default:
      return "Activity";
  }
}

export default async function AdminCommunityPage() {
  try {
    await requireAdminViewer();
  } catch {
    redirect("/account");
  }

  const admin = getAdminSupabaseClient();
  if (!admin) {
    return (
      <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-rose-200">Supabase admin client is not configured.</p>
        </div>
      </main>
    );
  }

  let feed = null;
  let setupPending = false;
  let errorMessage: string | null = null;

  try {
    feed = await listRecentCommunityActivity(admin as any, 80);
  } catch (error) {
    if (isMissingCommunityActivityTables(error as { code?: string; message?: string })) {
      setupPending = true;
    } else {
      errorMessage = error instanceof Error ? error.message : "Could not load community activity.";
    }
  }

  const counts = feed?.counts ?? {
    comments: 0,
    commentReplies: 0,
    trackedThreads: 0,
    trackedReplies: 0,
    generalThreads: 0,
    generalReplies: 0,
  };

  return (
    <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/account" className="text-sm text-cyan-300 transition hover:text-cyan-200">
            {"<- Back to account"}
          </Link>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/releases"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Release controls
            </Link>
            <Link
              href="/community"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Open community
            </Link>
          </div>
        </div>

        <header className="mt-10 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Admin community inbox</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">See what changed across comments and discussions</h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            This inbox surfaces recent chapter comments, comment replies, tracked discussions, and forum replies so admin review does not depend on manually browsing the platform.
          </p>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Quick comments</p>
            <p className="mt-3 text-3xl font-semibold text-white">{counts.comments}</p>
            <p className="mt-2 text-sm text-slate-400">{counts.commentReplies} quick-comment replies tracked alongside them.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Tracked discussions</p>
            <p className="mt-3 text-3xl font-semibold text-white">{counts.trackedThreads}</p>
            <p className="mt-2 text-sm text-slate-400">{counts.trackedReplies} replies across chapter and lab follow-up threads.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">General forum</p>
            <p className="mt-3 text-3xl font-semibold text-white">{counts.generalThreads}</p>
            <p className="mt-2 text-sm text-slate-400">{counts.generalReplies} replies in local FabricLab general threads.</p>
          </div>
        </section>

        {setupPending ? (
          <section className="mt-8 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm leading-7 text-amber-100">
            Community activity tables are still being provisioned. Apply the latest Supabase migrations before using the admin inbox.
          </section>
        ) : null}

        {errorMessage ? (
          <section className="mt-8 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm leading-7 text-rose-100">
            {errorMessage}
          </section>
        ) : null}

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Recent activity</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Latest community events</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {!feed?.items.length ? (
              <div className="rounded-2xl border border-white/8 bg-[#020b16] px-4 py-3 text-sm text-slate-400">
                No community activity yet.
              </div>
            ) : (
              feed.items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/8 bg-[#020b16] p-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="rounded-full border border-white/10 px-2.5 py-1 uppercase tracking-[0.24em] text-cyan-300">
                      {getBadgeLabel(item.type)}
                    </span>
                    <span>{item.authorName}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{item.targetLabel}</p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-300">{item.body}</p>
                  <div className="mt-4">
                    <Link
                      href={item.href}
                      className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 transition hover:border-cyan-500/50 hover:text-cyan-200"
                    >
                      Open context
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
