"use client";

import { useCallback, useEffect, useState } from "react";

export type NotificationPreferences = {
  subscribed: boolean;
  hasSavedPreferences: boolean;
  email: string | null;
  notifyNewContent: boolean;
  notifyThreadActivity: boolean;
};

const NOTIFICATION_PREFS_EVENT = "fabriclab:notification-preferences-updated";

function coercePreferences(payload: Partial<NotificationPreferences> | null | undefined): NotificationPreferences {
  return {
    subscribed: payload?.subscribed ?? true,
    hasSavedPreferences: payload?.hasSavedPreferences ?? false,
    email: payload?.email ?? null,
    notifyNewContent: payload?.notifyNewContent ?? true,
    notifyThreadActivity: payload?.notifyThreadActivity ?? true,
  };
}

export function useNotificationPreferences(enabled: boolean) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setPreferences(null);
      setLoading(false);
      setError(null);
      return null;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/notifications/subscription", {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as Partial<NotificationPreferences> & { error?: string } | null;

    if (!response.ok) {
      const nextError = payload?.error ?? "Could not load notification preferences.";
      setError(nextError);
      setLoading(false);
      return null;
    }

    const next = coercePreferences(payload);
    setPreferences(next);
    setLoading(false);
    return next;
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationPreferences>;
      setPreferences(coercePreferences(customEvent.detail));
      setError(null);
      setLoading(false);
    };

    window.addEventListener(NOTIFICATION_PREFS_EVENT, handleUpdate as EventListener);
    return () => {
      window.removeEventListener(NOTIFICATION_PREFS_EVENT, handleUpdate as EventListener);
    };
  }, [enabled]);

  const savePreferences = useCallback(
    async (input: Partial<Pick<NotificationPreferences, "notifyNewContent" | "notifyThreadActivity">>) => {
      if (!enabled) {
        return null;
      }

      setSaving(true);
      setError(null);

      const response = await fetch("/api/notifications/subscription", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const payload = (await response.json().catch(() => null)) as
        | (Partial<NotificationPreferences> & { ok?: boolean; error?: string })
        | null;

      setSaving(false);

      if (!response.ok) {
        const nextError = payload?.error ?? "Could not save notification preferences.";
        setError(nextError);
        return null;
      }

      const next = coercePreferences({
        ...preferences,
        ...payload,
        hasSavedPreferences: true,
      });

      setPreferences(next);
      window.dispatchEvent(new CustomEvent<NotificationPreferences>(NOTIFICATION_PREFS_EVENT, { detail: next }));
      return next;
    },
    [enabled, preferences],
  );

  return {
    preferences,
    loading,
    saving,
    error,
    refresh,
    savePreferences,
  };
}
