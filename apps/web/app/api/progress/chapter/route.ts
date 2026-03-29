import { NextResponse } from "next/server";

import { getServerViewer } from "@/lib/auth/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const viewer = await getServerViewer();
  if (!viewer.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin unavailable" }, { status: 500 });
  }

  const { chapterSlug, completedPages } = (await request.json()) as {
    chapterSlug?: string;
    completedPages?: number[];
  };

  if (!chapterSlug || !Array.isArray(completedPages)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const lastPageIndex = completedPages.length > 0 ? Math.max(...completedPages) : 0;
  const adminDb = admin as any;
  await adminDb.from("chapter_progress").upsert(
    {
      user_id: viewer.user.id,
      chapter_slug: chapterSlug,
      completed_pages: completedPages,
      last_page_index: lastPageIndex,
      percent_complete: 0,
    },
    { onConflict: "user_id,chapter_slug" },
  );

  return NextResponse.json({ ok: true });
}

