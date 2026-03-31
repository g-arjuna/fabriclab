import { unstable_noStore as noStore } from "next/cache";

import type { ServerViewer } from "@/lib/auth/server";
import type { CatalogItem, CatalogKind, CatalogAccessState, SourceCatalogItem } from "@/lib/catalog/source";
import { SOURCE_CATALOG_ITEMS, getSourceCatalogItem, getSourceChapters, getSourceLabs } from "@/lib/catalog/source";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type CatalogRow = {
  slug: string;
  kind: CatalogKind;
  title: string | null;
  part: string | null;
  order_index: number | null;
  duration_minutes: number | null;
  description: string | null;
  tags: string[] | null;
  is_published: boolean;
  access_tier: "free" | "paid";
  preview_enabled: boolean;
  preview_summary: string | null;
};

function mergeCatalogItem(source: SourceCatalogItem, row?: CatalogRow | null): CatalogItem {
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

async function getCatalogRows(kind?: CatalogKind): Promise<CatalogRow[]> {
  noStore();

  const supabase = getAdminSupabaseClient() ?? await getServerSupabaseClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("content_catalog")
    .select(
      "slug, kind, title, part, order_index, duration_minutes, description, tags, is_published, access_tier, preview_enabled, preview_summary",
    );

  if (kind) {
    query = query.eq("kind", kind);
  }

  const { data } = await query;
  return (data ?? []) as CatalogRow[];
}

function buildAccessState(item: CatalogItem, viewer: ServerViewer, bypassAuth: boolean): CatalogAccessState {
  if (bypassAuth) {
    return {
      item,
      canAccess: true,
      isLocked: false,
      shouldShowPreview: false,
      isPublished: item.isPublished,
      isAdmin: viewer.isAdmin,
      hasPaidEntitlement: viewer.hasPaidEntitlement,
    };
  }

  const canAccess = viewer.isAdmin || !!viewer.user;
  const isLocked = !canAccess;

  return {
    item,
    canAccess,
    isLocked,
    shouldShowPreview: isLocked,
    isPublished: item.isPublished,
    isAdmin: viewer.isAdmin,
    hasPaidEntitlement: viewer.hasPaidEntitlement,
  };
}

export async function getCatalogAccessState(
  kind: CatalogKind,
  slug: string,
  viewer: ServerViewer,
): Promise<CatalogAccessState> {
  const source = getSourceCatalogItem(kind, slug);
  if (!source) {
    return {
      item: null,
      canAccess: false,
      isLocked: false,
      shouldShowPreview: false,
      isPublished: false,
      isAdmin: viewer.isAdmin,
      hasPaidEntitlement: viewer.hasPaidEntitlement,
    };
  }

  const bypassAuth = !isSupabaseConfigured();
  if (bypassAuth) {
    return buildAccessState(mergeCatalogItem(source), viewer, true);
  }

  const rows = await getCatalogRows(kind);
  const row = rows.find((entry) => entry.slug === slug && entry.kind === kind) ?? null;
  const item = mergeCatalogItem(source, row);

  if (!item.isPublished && !viewer.isAdmin) {
    return {
      item,
      canAccess: false,
      isLocked: false,
      shouldShowPreview: false,
      isPublished: false,
      isAdmin: viewer.isAdmin,
      hasPaidEntitlement: viewer.hasPaidEntitlement,
    };
  }

  return buildAccessState(item, viewer, false);
}

export async function getCurriculumCatalog(viewer: ServerViewer): Promise<{
  chapters: CatalogItem[];
  labs: CatalogItem[];
}> {
  const bypassAuth = !isSupabaseConfigured();
  if (bypassAuth) {
    return {
      chapters: getSourceChapters().map((item) => mergeCatalogItem(item)),
      labs: getSourceLabs().map((item) => mergeCatalogItem(item)),
    };
  }

  const rows = await getCatalogRows();
  const rowMap = new Map(rows.map((row) => [`${row.kind}:${row.slug}`, row]));

  const mergeAll = (items: SourceCatalogItem[]) =>
    items
      .map((item) => mergeCatalogItem(item, rowMap.get(`${item.kind}:${item.slug}`) ?? null))
      .filter((item) => item.isPublished || viewer.isAdmin)
      .sort((left, right) => left.number - right.number);

  return {
    chapters: mergeAll(getSourceChapters()),
    labs: mergeAll(getSourceLabs()),
  };
}

export function groupChaptersByPart(chapters: CatalogItem[]) {
  return chapters.reduce<Record<string, CatalogItem[]>>((accumulator, chapter) => {
    const key = chapter.partKey ?? "ungrouped";
    accumulator[key] = accumulator[key] ?? [];
    accumulator[key].push(chapter);
    return accumulator;
  }, {});
}

export async function getHomepageCatalog(): Promise<CatalogItem[]> {
  noStore();

  const bypassAuth = !isSupabaseConfigured();
  if (bypassAuth) {
    return getSourceChapters().map((item) => mergeCatalogItem(item));
  }

  const rows = await getCatalogRows("chapter");
  const rowMap = new Map(rows.map((row) => [row.slug, row]));

  return getSourceChapters()
    .map((item) => mergeCatalogItem(item, rowMap.get(item.slug) ?? null))
    .sort((a, b) => a.number - b.number);
}

export function getSourceCatalogSeedRows() {
  return SOURCE_CATALOG_ITEMS.map((item) => ({
    slug: item.slug,
    kind: item.kind,
    title: item.title,
    part: item.partTitle ?? null,
    order_index: item.number,
    duration_minutes: item.durationMinutes,
    description: item.description,
    tags: item.tags,
    is_published: item.defaultPublished,
    access_tier: "free",
    preview_enabled: item.defaultPreviewEnabled,
    preview_summary: item.previewSummary,
  }));
}
