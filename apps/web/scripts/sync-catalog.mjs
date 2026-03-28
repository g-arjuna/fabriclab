import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set both before running catalog sync.",
    );
  }

  const catalogPath = path.resolve(__dirname, "../content/catalog.json");
  const rawCatalog = await fs.readFile(catalogPath, "utf8");
  const catalog = JSON.parse(rawCatalog);
  const items = [...catalog.chapters, ...catalog.labs];

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: existingRows, error: fetchError } = await supabase
    .from("content_catalog")
    .select("slug, kind, is_published, access_tier, preview_enabled, preview_summary");

  if (fetchError) {
    throw fetchError;
  }

  const existingMap = new Map(
    (existingRows ?? []).map((row) => [`${row.kind}:${row.slug}`, row]),
  );

  const payload = items.map((item) => {
    const existing = existingMap.get(`${item.kind}:${item.slug}`);
    return {
      slug: item.slug,
      kind: item.kind,
      title: item.title,
      part: item.partTitle ?? null,
      order_index: item.number,
      duration_minutes: item.durationMinutes,
      description: item.description,
      tags: item.tags,
      is_published: existing?.is_published ?? item.defaultPublished,
      access_tier: existing?.access_tier ?? item.defaultAccessTier,
      preview_enabled: existing?.preview_enabled ?? item.defaultPreviewEnabled,
      preview_summary: existing?.preview_summary ?? item.previewSummary,
    };
  });

  const { error: upsertError } = await supabase.from("content_catalog").upsert(payload, {
    onConflict: "kind,slug",
  });

  if (upsertError) {
    throw upsertError;
  }

  console.log(`Synced ${payload.length} catalog rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

