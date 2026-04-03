import Link from "next/link";

import { NotificationPreferencesPanel } from "@/components/notifications/NotificationPreferencesPanel";
import { PublicTopNav } from "@/components/layout/PublicTopNav";
import { getServerViewer } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const viewer = await getServerViewer();

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <PublicTopNav ctaHref="/curriculum" ctaLabel="Browse curriculum" />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Account</p>
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Access and release status
          </h1>
        </div>

        {!viewer.user ? (
          <div className="mt-8 rounded-[1.9rem] border border-white/8 bg-slate-900/70 p-6 sm:p-8">
            <p className="text-sm leading-7 text-slate-300">
              You are currently browsing the public catalog as a guest. Sign in to open chapters and
              labs, keep progress synced across devices, and access any admin tooling attached to
              your account.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.7rem] border border-white/8 bg-slate-900/70 p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Identity</p>
              <p className="mt-4 break-words text-lg font-semibold text-white">
                {viewer.email ?? "Signed in"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {viewer.isAdmin ? "Admin access enabled." : "Standard learner account."}
              </p>
            </div>

            <div className="rounded-[1.7rem] border border-white/8 bg-slate-900/70 p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Access</p>
              <p className="mt-4 text-lg font-semibold text-white">Signed-in learner access</p>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                This account can open published chapters and labs, save progress, and participate in
                community discussion. Any admin privileges attached to it appear below.
              </p>
            </div>

            {viewer.isAdmin ? (
              <div className="rounded-[1.7rem] border border-cyan-500/20 bg-cyan-500/10 p-6 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Admin tools</p>
                <p className="mt-3 text-sm leading-7 text-cyan-100">
                  Manage content release state and internal test metadata from the release-control dashboard.
                </p>
                <Link
                  href="/admin/releases"
                  className="mt-5 inline-flex rounded-full border border-cyan-400/30 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/50 hover:text-white"
                >
                  Open release controls
                </Link>
              </div>
            ) : null}

            <NotificationPreferencesPanel />
          </div>
        )}
      </div>
    </main>
  );
}
