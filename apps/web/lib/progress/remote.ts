"use client";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type RemoteProgressPayload = {
  completedPages: Record<string, number[]>;
  completedLabs: Record<
    string,
    {
      completedAt: number;
      score: number;
      attempts: number;
    }
  >;
};

async function getAuthenticatedBrowserUser(): Promise<User | null> {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Failed to read browser auth session for progress sync.", error.message);
    return null;
  }

  return session?.user ?? null;
}

export async function loadRemoteProgress(): Promise<RemoteProgressPayload> {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) {
    return {
      completedPages: {},
      completedLabs: {},
    };
  }

  const user = await getAuthenticatedBrowserUser();
  if (!user) {
    return {
      completedPages: {},
      completedLabs: {},
    };
  }

  const [{ data: chapters }, { data: labs }] = await Promise.all([
    supabase
      .from("chapter_progress")
      .select("chapter_slug, completed_pages")
      .eq("user_id", user.id),
    supabase
      .from("lab_progress")
      .select("lab_id, score, attempts, completed_at, completed")
      .eq("user_id", user.id),
  ]);

  return {
    completedPages: Object.fromEntries(
      (chapters ?? []).map((row) => [row.chapter_slug, row.completed_pages ?? []]),
    ),
    completedLabs: Object.fromEntries(
      (labs ?? [])
        .filter((row) => row.completed)
        .map((row) => [
          row.lab_id,
          {
            completedAt: row.completed_at ? new Date(row.completed_at).getTime() : Date.now(),
            score: row.score ?? 0,
            attempts: row.attempts ?? 1,
          },
        ]),
    ),
  };
}

export async function syncChapterProgress(
  chapterSlug: string,
  completedPages: number[],
): Promise<void> {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) {
    return;
  }

  const user = await getAuthenticatedBrowserUser();
  if (!user) {
    return;
  }

  const lastPageIndex = completedPages.length > 0 ? Math.max(...completedPages) : 0;

  const { error } = await supabase.from("chapter_progress").upsert(
    {
      user_id: user.id,
      chapter_slug: chapterSlug,
      completed_pages: completedPages,
      last_page_index: lastPageIndex,
      percent_complete: 0,
    },
    {
      onConflict: "user_id,chapter_slug",
    },
  );

  if (error) {
    console.error(`Failed to sync chapter progress for ${chapterSlug}.`, error.message);
  }
}

export async function syncLabProgress(
  labId: string,
  payload: { completedAt: number; score: number; attempts: number },
): Promise<void> {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) {
    return;
  }

  const user = await getAuthenticatedBrowserUser();
  if (!user) {
    return;
  }

  const { error } = await supabase.from("lab_progress").upsert(
    {
      user_id: user.id,
      lab_id: labId,
      completed: true,
      score: payload.score,
      attempts: payload.attempts,
      completed_at: new Date(payload.completedAt).toISOString(),
    },
    {
      onConflict: "user_id,lab_id",
    },
  );

  if (error) {
    console.error(`Failed to sync lab progress for ${labId}.`, error.message);
  }
}
