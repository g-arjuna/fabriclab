"use client";

import { useEffect, useRef } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  loadRemoteProgress,
  syncChapterProgress,
  syncLabProgress,
} from "@/lib/progress/remote";
import { useProgressStore } from "@/store/progressStore";

export function ProgressSync() {
  const { enabled, loading, user } = useAuth();
  const completedPages = useProgressStore((state) => state.completedPages);
  const completedLabs = useProgressStore((state) => state.completedLabs);
  const mode = useProgressStore((state) => state.mode);
  const hydrateRemoteProgress = useProgressStore((state) => state.hydrateRemoteProgress);
  const switchToGuestMode = useProgressStore((state) => state.switchToGuestMode);
  const syncedUserIdRef = useRef<string | null>(null);
  const hydratedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!enabled || !user) {
      hydratedUserIdRef.current = null;
      syncedUserIdRef.current = null;
      switchToGuestMode();
      return;
    }

    if (hydratedUserIdRef.current === user.id) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const remoteSnapshot = await loadRemoteProgress();
      if (cancelled) {
        return;
      }

      hydrateRemoteProgress(remoteSnapshot);
      hydratedUserIdRef.current = user.id;
      syncedUserIdRef.current = user.id;
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, hydrateRemoteProgress, loading, switchToGuestMode, user]);

  useEffect(() => {
    if (!enabled || loading || !user || mode !== "remote") {
      return;
    }

    if (hydratedUserIdRef.current !== user.id) {
      return;
    }

    syncedUserIdRef.current = user.id;

    Object.entries(completedPages).forEach(([chapterSlug, pages]) => {
      void syncChapterProgress(chapterSlug, pages);
    });

    Object.entries(completedLabs).forEach(([labId, payload]) => {
      void syncLabProgress(labId, payload);
    });
  }, [completedLabs, completedPages, enabled, loading, mode, user]);

  return null;
}
