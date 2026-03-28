"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export default function LoginPage() {
  const { user, enabled } = useAuth();
  const env = useMemo(() => getPublicSupabaseEnv(), []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!enabled) {
    return (
      <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-slate-900/70 p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Auth unavailable</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Supabase is not configured</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Add the Supabase environment variables from
            {" "}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">.env.example</code>
            {" "}
            to enable sign-in and gated access.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
        <Link href="/curriculum" className="text-sm text-cyan-300 transition hover:text-cyan-200">
          Back to curriculum
        </Link>
        <p className="mt-8 text-xs uppercase tracking-[0.28em] text-slate-500">FabricLab access</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          {user ? "You're already signed in" : "Sign in with a magic link"}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          Use a passwordless link to sync progress, keep your place across devices, and manage release testing.
        </p>

        {!user && (
          <div className="mt-8 rounded-2xl border border-white/8 bg-[#020b16] p-5">
            <label htmlFor="email" className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@fabriclab.dev"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500/40"
            />
            <button
              type="button"
              disabled={!email || submitting}
              onClick={async () => {
                const client = getBrowserSupabaseClient();
                if (!client || !env) {
                  return;
                }

                setSubmitting(true);
                setStatus(null);

                const { error } = await client.auth.signInWithOtp({
                  email,
                  options: {
                    emailRedirectTo: `${env.appUrl}/auth/callback`,
                  },
                });

                setSubmitting(false);
                setStatus(
                  error
                    ? error.message
                    : "Magic link sent. Open the email on this device to complete sign-in.",
                );
              }}
              className="mt-4 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send magic link"}
            </button>
          </div>
        )}

        {status ? (
          <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
            {status}
          </div>
        ) : null}

        {user ? (
          <Link
            href="/account"
            className="mt-8 inline-flex rounded-full border border-white/10 bg-slate-950 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Go to account
          </Link>
        ) : null}
      </div>
    </main>
  );
}
