"use client";

import { useEffect, useState } from "react";

import { useNotificationPreferences } from "@/components/notifications/useNotificationPreferences";

export function NotificationPreferencesPanel() {
  const { preferences, loading, saving, error, savePreferences } = useNotificationPreferences(true);
  const [notifyNewContent, setNotifyNewContent] = useState(true);
  const [notifyThreadActivity, setNotifyThreadActivity] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!preferences) {
      return;
    }

    setNotifyNewContent(preferences.notifyNewContent);
    setNotifyThreadActivity(preferences.notifyThreadActivity);
  }, [preferences]);

  async function handleSave() {
    const next = await savePreferences({
      notifyNewContent,
      notifyThreadActivity,
    });

    if (!next) {
      return;
    }

    setMessage("Notification preferences saved.");
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#020b16] p-6 md:col-span-2">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Notifications</p>
      <h2 className="mt-3 text-xl font-semibold text-white">Email preferences</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
        Choose whether FabricLab should email you about newly released content and replies to
        discussions you participate in. You can change this anytime.
      </p>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-white/8 bg-slate-950/80 px-4 py-3 text-sm text-slate-400">
          Loading notification preferences...
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={notifyNewContent}
              onChange={(event) => setNotifyNewContent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
            />
            <span>
              <span className="block font-medium text-slate-200">Notify me about new content</span>
              <span className="mt-1 block text-xs leading-6 text-slate-500">
                Receive a short email when new chapters or labs are published.
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
              <span className="block font-medium text-slate-200">Notify me about discussion replies</span>
              <span className="mt-1 block text-xs leading-6 text-slate-500">
                Receive email when someone replies to a discussion thread you started or joined.
              </span>
            </span>
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-7 text-rose-100">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-7 text-emerald-100">
              {message}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-slate-500">
              {preferences?.email
                ? `Emails will be sent to ${preferences.email}.`
                : "Emails will be sent to your signed-in account address."}
            </p>
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                void handleSave();
              }}
              disabled={saving || loading}
              className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : preferences?.hasSavedPreferences ? "Update preferences" : "Save preferences"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
