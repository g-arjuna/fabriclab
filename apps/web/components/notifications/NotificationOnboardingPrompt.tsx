"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useNotificationPreferences } from "@/components/notifications/useNotificationPreferences";

const DISMISS_KEY = "fabriclab-notification-prompt-dismissed";

export function NotificationOnboardingPrompt() {
  const { user, loading: authLoading } = useAuth();
  const { preferences, loading, saving, error, savePreferences } = useNotificationPreferences(Boolean(user));
  const [notifyNewContent, setNotifyNewContent] = useState(true);
  const [notifyThreadActivity, setNotifyThreadActivity] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!user) {
      sessionStorage.removeItem(DISMISS_KEY);
      setDismissed(true);
      return;
    }

    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, [user]);

  useEffect(() => {
    if (!preferences) {
      return;
    }

    setNotifyNewContent(preferences.notifyNewContent);
    setNotifyThreadActivity(preferences.notifyThreadActivity);
  }, [preferences]);

  const open = useMemo(() => {
    if (authLoading || loading || !user || !preferences) {
      return false;
    }

    return !preferences.hasSavedPreferences && !dismissed;
  }, [authLoading, dismissed, loading, preferences, user]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-cyan-500/20 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/60">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">FabricLab notifications</p>
        <h2 className="mt-4 text-2xl font-semibold text-white">Choose what FabricLab should email you about</h2>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          You’re signed in, so we can keep progress synced and notify you when new content ships or
          when discussions you take part in receive replies.
        </p>

        <div className="mt-6 space-y-4">
          <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={notifyNewContent}
              onChange={(event) => setNotifyNewContent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
            />
            <span>
              <span className="block font-medium text-slate-200">New chapter and lab releases</span>
              <span className="mt-1 block text-xs leading-6 text-slate-500">
                Get a short note when new FabricLab content is published.
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
              <span className="block font-medium text-slate-200">Replies to discussions I join</span>
              <span className="mt-1 block text-xs leading-6 text-slate-500">
                Receive email when someone replies to a thread you start or participate in.
              </span>
            </span>
          </label>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-7 text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, "1");
              setDismissed(true);
            }}
            className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={async () => {
              const next = await savePreferences({
                notifyNewContent,
                notifyThreadActivity,
              });

              if (!next) {
                return;
              }

              sessionStorage.removeItem(DISMISS_KEY);
              setDismissed(true);
            }}
            disabled={saving}
            className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
