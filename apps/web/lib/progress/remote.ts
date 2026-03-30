"use client";

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

export async function loadRemoteProgress(): Promise<RemoteProgressPayload> {
  const response = await fetch("/api/progress", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      completedPages: {},
      completedLabs: {},
    };
  }

  return (await response.json()) as RemoteProgressPayload;
}

export async function syncChapterProgress(
  chapterSlug: string,
  completedPages: number[],
): Promise<void> {
  await fetch("/api/progress/chapter", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chapterSlug, completedPages }),
  });
}

export async function syncLabProgress(
  labId: string,
  payload: { completedAt: number; score: number; attempts: number },
): Promise<void> {
  await fetch("/api/progress/lab", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ labId, payload }),
  });
}
