"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";

import { useAuth } from "@/components/auth/AuthProvider";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { getEnabledSocialAuthProviders, getPublicSupabaseEnv } from "@/lib/supabase/env";

const socialProviderLabels: Partial<Record<Provider, string>> = {
  apple: "Apple",
  azure: "Azure",
  bitbucket: "Bitbucket",
  discord: "Discord",
  facebook: "Facebook",
  figma: "Figma",
  github: "GitHub",
  gitlab: "GitLab",
  google: "Google",
  kakao: "Kakao",
  keycloak: "Keycloak",
  linkedin: "LinkedIn",
  linkedin_oidc: "LinkedIn",
  notion: "Notion",
  slack: "Slack",
  slack_oidc: "Slack",
  spotify: "Spotify",
  twitch: "Twitch",
  twitter: "Twitter/X",
  workos: "WorkOS",
  zoom: "Zoom",
  fly: "Fly.io",
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

function getSocialProviderIcon(provider: Provider) {
  switch (provider) {
    case "google":
      return <GoogleMark />;
    case "github":
      return <GitHubMark />;
    default:
      return <span className="text-xs text-cyan-300">SSO</span>;
  }
}

function LoginPageContent() {
  const { user, enabled } = useAuth();
  const searchParams = useSearchParams();
  const env = useMemo(() => getPublicSupabaseEnv(), []);
  const socialProviders = useMemo(() => getEnabledSocialAuthProviders(), []);
  const nextPath = searchParams.get("next") ?? "/curriculum";
  const callbackUrl = useMemo(() => {
    if (!env) {
      return null;
    }

    return `${env.appUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }, [env, nextPath]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState<Provider | null>(null);

  if (!enabled) {
    return (
      <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-slate-900/70 p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Auth unavailable</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Supabase is not configured</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Add the Supabase environment variables from{" "}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">.env.example</code>{" "}
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
        <div className="mt-8 rounded-3xl border border-cyan-400/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_48%),linear-gradient(180deg,rgba(8,18,35,0.94),rgba(4,10,22,0.96))] p-6">
          <div className="flex items-start gap-4">
            <FabricLabGlyph />
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-cyan-300">FabricLab access</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">
                {user ? "You're already signed in" : "Sign in"}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Continue into the interactive AI networking curriculum, open chapters and labs, save
                progress across the platform, and join technical discussion under each lesson.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">
                  Progress sync
                </span>
                <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">
                  Labs + chapters
                </span>
                <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">
                  Community threads
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-6 text-sm leading-7 text-slate-400">
          Use Google or GitHub for the fastest path, or request a branded FabricLab magic link by
          email. Sign-in is now the entry point for chapter access, lab access, progress sync, and
          community participation.
        </p>

        {!user && (
          <div className="mt-8 space-y-6">
            {socialProviders.length > 0 ? (
              <div className="rounded-2xl border border-white/8 bg-[#020b16] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Social sign-in</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {socialProviders.map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      disabled={oauthSubmitting !== null}
                      onClick={async () => {
                        const client = getBrowserSupabaseClient();
                        if (!client || !callbackUrl) {
                          return;
                        }

                        setOauthSubmitting(provider);
                        setStatus(null);

                        const { error } = await client.auth.signInWithOAuth({
                          provider,
                          options: {
                            redirectTo: callbackUrl,
                          },
                        });

                        if (error) {
                          setOauthSubmitting(null);
                          setStatus(error.message);
                        }
                      }}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:border-cyan-500/40 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100">
                          {getSocialProviderIcon(provider)}
                        </span>
                        <span className="flex flex-col">
                          <span>
                            {oauthSubmitting === provider
                              ? `Redirecting to ${socialProviderLabels[provider] ?? provider}...`
                              : `Continue with ${socialProviderLabels[provider] ?? provider}`}
                          </span>
                          <span className="text-xs font-normal text-slate-500">
                            Fast sign-in for FabricLab progress and discussion
                          </span>
                        </span>
                      </span>
                      <span className="text-cyan-300">{"\u2197"}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/8 bg-[#020b16] p-5">
              <label htmlFor="email" className="text-xs uppercase tracking-[0.28em] text-slate-500">
                FabricLab magic link
              </label>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                We&apos;ll send a FabricLab sign-in email with a secure link back to this device.
              </p>
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
                disabled={!email || submitting || oauthSubmitting !== null}
                onClick={async () => {
                  const client = getBrowserSupabaseClient();
                  if (!client || !callbackUrl) {
                    return;
                  }

                  setSubmitting(true);
                  setStatus(null);

                  const { error } = await client.auth.signInWithOtp({
                    email,
                    options: {
                      emailRedirectTo: callbackUrl,
                    },
                  });

                  setSubmitting(false);
                  setStatus(
                    error
                      ? error.message
                      : `FabricLab sign-in link sent to ${email}. Open the email on this device to complete sign-in.`,
                  );
                }}
                className="mt-4 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send magic link"}
              </button>
            </div>
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

function LoginPageFallback() {
  return (
    <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
        <p className="text-sm text-slate-400">Preparing sign-in...</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
