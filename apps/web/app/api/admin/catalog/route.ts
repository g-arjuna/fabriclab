import { NextResponse } from "next/server";

import { requireAdminViewer } from "@/lib/auth/server";
import { getSourceCatalogItem, type AccessTier, type CatalogKind } from "@/lib/catalog/source";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

type CatalogPatch = {
  isPublished?: boolean;
  accessTier?: AccessTier;
  previewEnabled?: boolean;
  previewSummary?: string;
};

export async function PATCH(request: Request) {
  try {
    await requireAdminViewer();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }
  const adminDb = admin as any;

  const body = (await request.json().catch(() => null)) as
    | { kind?: CatalogKind; slug?: string; patch?: CatalogPatch }
    | null;

  if (!body?.kind || !body.slug || !body.patch) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const source = getSourceCatalogItem(body.kind, body.slug);
  if (!source) {
    return NextResponse.json({ error: "Catalog item not found." }, { status: 404 });
  }

  const { data: existing } = await adminDb
    .from("content_catalog")
    .select("is_published, access_tier, preview_enabled, preview_summary")
    .eq("kind", body.kind)
    .eq("slug", body.slug)
    .maybeSingle();

  const payload = {
    kind: body.kind,
    slug: body.slug,
    title: source.title,
    part: source.partTitle ?? null,
    order_index: source.number,
    duration_minutes: source.durationMinutes,
    description: source.description,
    tags: source.tags,
    is_published: body.patch.isPublished ?? existing?.is_published ?? source.defaultPublished,
    access_tier: body.patch.accessTier ?? existing?.access_tier ?? source.defaultAccessTier,
    preview_enabled:
      body.patch.previewEnabled ?? existing?.preview_enabled ?? source.defaultPreviewEnabled,
    preview_summary:
      body.patch.previewSummary ?? existing?.preview_summary ?? source.previewSummary,
  };

  const { error } = await adminDb.from("content_catalog").upsert(payload, {
    onConflict: "kind,slug",
    ignoreDuplicates: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
