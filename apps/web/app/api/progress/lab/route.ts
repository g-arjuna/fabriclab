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

  const { labId, payload } = (await request.json()) as {
    labId?: string;
    payload?: { completedAt: number; score: number; attempts: number };
  };

  if (!labId || !payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const adminDb = admin as any;
  await adminDb.from("lab_progress").upsert(
    {
      user_id: viewer.user.id,
      lab_id: labId,
      completed: true,
      score: payload.score,
      attempts: payload.attempts,
      completed_at: new Date(payload.completedAt).toISOString(),
    },
    { onConflict: "user_id,lab_id" },
  );

  return NextResponse.json({ ok: true });
}

