import Link from "next/link";
import { redirect } from "next/navigation";

import { ReleaseControlsClient } from "@/components/admin/ReleaseControlsClient";
import { requireAdminViewer } from "@/lib/auth/server";
import { SOURCE_CATALOG_ITEMS } from "@/lib/catalog/source";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

type CatalogRow = {
  kind: "chapter" | "lab";
  slug: string;
  is_published: boolean;
  preview_enabled: boolean;
  preview_summary: string | null;
};

export default async function AdminReleasesPage() {
  try {
    await requireAdminViewer();
  } catch {
    redirect("/account");
  }

  const admin = getAdminSupabaseClient();
  const { data } = admin
    ? await admin
        .from("content_catalog")
        .select("kind, slug, is_published, preview_enabled, preview_summary")
    : { data: [] as CatalogRow[] };

  const rowMap = new Map(
    ((data ?? []) as CatalogRow[]).map((row) => [`${row.kind}:${row.slug}`, row]),
  );

  const initialItems = SOURCE_CATALOG_ITEMS.map((item) => {
    const row = rowMap.get(`${item.kind}:${item.slug}`);

    return {
      kind: item.kind,
      slug: item.slug,
      title: item.title,
      href: item.href,
      number: item.number,
      partTitle: item.partTitle,
      durationLabel: item.durationLabel,
      isPublished: row?.is_published ?? item.defaultPublished,
      previewEnabled: row?.preview_enabled ?? item.defaultPreviewEnabled,
      previewSummary: row?.preview_summary ?? item.previewSummary,
      description: item.description,
    };
  }).sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }

    return left.number - right.number;
  });

  return (
    <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/account" className="text-sm text-cyan-300 transition hover:text-cyan-200">
            {"<- Back to account"}
          </Link>
          <Link
            href="/curriculum"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Open curriculum
          </Link>
        </div>

        <header className="mt-10 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Admin release control</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Manage publish state and previews</h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Content remains git-backed. This dashboard controls what is live in the public catalog,
            what still stays hidden, and how preview shells read before full access is granted.
          </p>
        </header>

        <div className="mt-10">
          <ReleaseControlsClient initialItems={initialItems} />
        </div>
      </div>
    </main>
  );
}
