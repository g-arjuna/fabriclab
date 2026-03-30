"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { getEnabledOAuthProviders } from "@/lib/auth/env";

type OAuthProvider = "google" | "github";

const socialProviderLabels: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12.24 10.285v3.91h5.427c-.238 1.258-.952 2.324-2.03 3.04l3.286 2.55c1.916-1.765 3.017-4.362 3.017-7.46 0-.715-.064-1.404-.184-2.04H12.24Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.73 0 5.02-.904 6.693-2.444l-3.286-2.55c-.905.607-2.06.97-3.407.97-2.62 0-4.84-1.77-5.636-4.145H2.97v2.63A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#4A90E2"
        d="M6.364 13.83a5.996 5.996 0 0 1 0-3.66V7.54H2.97a10 10 0 0 0 0 8.92l3.394-2.63Z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.024c1.485 0 2.82.51 3.87 1.514l2.903-2.902C17.015 2.995 14.728 2 12 2A10 10 0 0 0 2.97 7.54l3.394 2.63C7.16 7.794 9.38 6.024 12 6.024Z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M12 .5C5.65.5.5 5.7.5 12.13c0 5.14 3.29 9.5 7.86 11.03.58.11.79-.26.79-.57 0-.28-.01-1.03-.02-2.03-3.2.71-3.88-1.57-3.88-1.57-.52-1.35-1.28-1.71-1.28-1.71-1.04-.73.08-.71.08-.71 1.15.08 1.75 1.2 1.75 1.2 1.02 1.78 2.68 1.27 3.33.97.1-.75.4-1.27.72-1.56-2.55-.3-5.24-1.3-5.24-5.76 0-1.27.45-2.3 1.18-3.12-.12-.3-.51-1.5.11-3.14 0 0 .97-.31 3.17 1.19a10.86 10.86 0 0 1 5.78 0c2.19-1.5 3.16-1.19 3.16-1.19.63 1.64.24 2.84.12 3.14.74.82 1.18 1.85 1.18 3.12 0 4.47-2.69 5.46-5.25 5.75.41.36.77 1.06.77 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.69.8.57A11.66 11.66 0 0 0 23.5 12.13C23.5 5.7 18.35.5 12 .5Z" />
    </svg>
  );
}

function FabricLabGlyph() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.14)]">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-cyan-300">
        <path
          d="M5 6h5l2 3h7v9H9l-2-3H5V6Zm2 2v5h1.1l2 3H17v-5h-6.1l-2-3H7Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

function getProviderIcon(provider: OAuthProvider) {
  return provider === "google" ? <GoogleMark /> : <GitHubMark />;
}

function LoginPageContent() {
  const { user, enabled } = useAuth();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/curriculum";
  const error = searchParams.get("error");
  const providers = useMemo(() => getEnabledOAuthProviders(), []);

  if (!enabled) {
    return (
      <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-slate-900/70 p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Auth unavailable</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Sign-in is not configured</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Add the FabricLab OAuth environment variables to enable Google or GitHub sign-in.
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

        <div className="mt-8 rounded-3xl border border-cyan-400/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_48%),linear-gradient(180deg,rgba(8,18,35,0.94),rgba(4,10,22,0.96))] p-6">
          <div className="flex items-start gap-4">
            <FabricLabGlyph />
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-cyan-300">FabricLab access</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">
                {user ? "You're already signed in" : "Sign in"}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Continue into chapters and labs, keep progress synced, and join technical discussion.
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-6 rounded-xl border border-rose-400/30 bg-rose-900/20 px-4 py-3 text-sm text-rose-200">
            Login failed ({error}). Please try again.
          </p>
        ) : null}

        {!user ? (
          <div className="mt-8 rounded-2xl border border-white/8 bg-[#020b16] p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">FabricLab sign-in</p>
            {providers.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {providers.map((provider) => (
                  <Link
                    key={provider}
                    href={`/api/auth/login/${provider}?next=${encodeURIComponent(nextPath)}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:border-cyan-500/40 hover:bg-slate-900 hover:text-white"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100">
                        {getProviderIcon(provider)}
                      </span>
                      Continue with {socialProviderLabels[provider]}
                    </span>
                    <span className="text-cyan-300">{"\u2197"}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-slate-400">
                No OAuth providers are configured yet. Add Google or GitHub credentials in the
                FabricLab auth environment before enabling this page.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-5">
            <p className="text-sm text-cyan-100">Signed in as {user.email ?? "learner"}.</p>
            <Link
              href={nextPath}
              className="mt-4 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Continue
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#020617]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
