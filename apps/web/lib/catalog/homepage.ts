import { unstable_noStore as noStore } from "next/cache";

import type { CatalogItem, CatalogKind } from "@/lib/catalog/source";
import { getSourceChapters } from "@/lib/catalog/source";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Intentionally does NOT import from lib/supabase/server (no next/headers dependency)
// so that app/page.tsx (root server component) can import this safely.

type HomepageCatalogRow = {
  slug: string;
  kind: CatalogKind;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  is_published: boolean;
  access_tier: "free" | "paid";
  preview_enabled: boolean;
  preview_summary: string | null;
};

function mergeRow(source: ReturnType<typeof getSourceChapters>[number], row?: HomepageCatalogRow | null): CatalogItem {
  return {
    ...source,
    title: row?.title ?? source.title,
    description: row?.description ?? source.description,
    previewSummary: row?.preview_summary ?? source.previewSummary,
    tags: row?.tags ?? source.tags,
    isPublished: row?.is_published ?? source.defaultPublished,
    accessTier: "free",
    previewEnabled: row?.preview_enabled ?? source.defaultPreviewEnabled,
  };
}

export async function getHomepageCatalog(): Promise<CatalogItem[]> {
  noStore();

  const adminClient = getAdminSupabaseClient();
  if (!adminClient || !isSupabaseConfigured()) {
    return getSourceChapters().map((item) => mergeRow(item));
  }

  const { data } = await (adminClient as any)
    .from("content_catalog")
    .select("slug, kind, title, description, tags, is_published, access_tier, preview_enabled, preview_summary")
    .eq("kind", "chapter");

  const rows: HomepageCatalogRow[] = (data ?? []) as HomepageCatalogRow[];
  const rowMap = new Map(rows.map((row) => [row.slug, row]));

  return getSourceChapters()
    .map((item) => mergeRow(item, rowMap.get(item.slug) ?? null))
    .sort((a, b) => a.number - b.number);
}
