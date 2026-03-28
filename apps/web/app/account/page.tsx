import Link from "next/link";

import { getServerViewer } from "@/lib/auth/server";

export default async function AccountPage() {
  const viewer = await getServerViewer();

  return (
    <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
        <Link href="/curriculum" className="text-sm text-cyan-300 transition hover:text-cyan-200">
          Back to curriculum
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.28em] text-slate-500">Account</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Access and release status</h1>

        {!viewer.user ? (
          <div className="mt-8 rounded-2xl border border-white/8 bg-[#020b16] p-6">
            <p className="text-sm leading-7 text-slate-300">
              You are currently browsing as a guest. Sign in if you want synced progress across
              devices or access to admin tooling.
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
            <div className="rounded-2xl border border-white/8 bg-[#020b16] p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Identity</p>
              <p className="mt-4 text-lg font-semibold text-white">{viewer.email ?? "Signed in"}</p>
              <p className="mt-2 text-sm text-slate-400">
                {viewer.isAdmin ? "Admin access enabled." : "Standard learner account."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#020b16] p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Access</p>
              <p className="mt-4 text-lg font-semibold text-white">
                Full public catalog
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Published chapters and labs are open to everyone. This account is mainly useful for
                synced progress and any admin privileges attached to it.
              </p>
            </div>

            {viewer.isAdmin ? (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Admin tools</p>
                <p className="mt-3 text-sm leading-7 text-cyan-100">
                  Manage content release state and manual entitlements from the release-control dashboard.
                </p>
                <Link
                  href="/admin/releases"
                  className="mt-5 inline-flex rounded-full border border-cyan-400/30 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/50 hover:text-white"
                >
                  Open release controls
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
