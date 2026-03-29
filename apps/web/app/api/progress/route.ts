import { NextResponse } from "next/server";

import { getServerViewer } from "@/lib/auth/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const viewer = await getServerViewer();
  if (!viewer.user) {
    return NextResponse.json({
      completedPages: {},
      completedLabs: {},
    });
  }

  const admin = getAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({
      completedPages: {},
      completedLabs: {},
    });
  }

  const adminDb = admin as any;

  const [{ data: chapters }, { data: labs }] = await Promise.all([
    adminDb.from("chapter_progress").select("chapter_slug, completed_pages").eq("user_id", viewer.user.id),
    adminDb
      .from("lab_progress")
      .select("lab_id, score, attempts, completed_at, completed")
      .eq("user_id", viewer.user.id),
  ]);

  return NextResponse.json({
    completedPages: Object.fromEntries(
      (chapters ?? []).map((row: { chapter_slug: string; completed_pages: number[] }) => [
        row.chapter_slug,
        row.completed_pages ?? [],
      ]),
    ),
    completedLabs: Object.fromEntries(
      (labs ?? [])
        .filter((row: { completed: boolean }) => row.completed)
        .map((row: { lab_id: string; completed_at: string | null; score: number | null; attempts: number | null }) => [
          row.lab_id,
          {
            completedAt: row.completed_at ? new Date(row.completed_at).getTime() : Date.now(),
            score: row.score ?? 0,
            attempts: row.attempts ?? 1,
          },
        ]),
    ),
  });
}

