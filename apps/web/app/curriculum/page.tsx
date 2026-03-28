import Link from "next/link";

import { AuthControls } from "@/components/auth/AuthControls";
import { CurriculumCard } from "@/components/catalog/CurriculumCard";
import { getServerViewer } from "@/lib/auth/server";
import { getCurriculumCatalog, groupChaptersByPart } from "@/lib/catalog/runtime";
import { PARTS, type CatalogItem } from "@/lib/catalog/source";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function canAccessItem(item: CatalogItem) {
  return true;
}

export default async function CurriculumPage() {
  const viewer = await getServerViewer();
  const authEnabled = isSupabaseConfigured();
  const { chapters, labs } = await getCurriculumCatalog(viewer);
  const chaptersByPart = groupChaptersByPart(chapters);

  return (
    <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-sm text-cyan-300 transition hover:text-cyan-200">
            {"<- FabricLab"}
          </Link>
          <AuthControls />
        </div>

        <header className="mt-10 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Learning path</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            HPC networking from hardware to routed AI fabrics
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Every published chapter and lab is open. Sign in if you want synced progress, an account
            page, or admin access for release-control work.
          </p>
        </header>

        {!authEnabled ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm leading-7 text-slate-300">
            Supabase is not configured in this environment yet, so the app is running in local mode.
            Add the environment values from
            {" "}
            <code className="rounded bg-slate-950 px-1.5 py-0.5 text-cyan-300">apps/web/.env.example</code>
            {" "}
            to enable sign-in, synced progress, and admin release controls.
          </div>
        ) : null}

        {PARTS.map((part) => {
          const items = chaptersByPart[part.key] ?? [];
          if (items.length === 0) {
            return null;
          }

          return (
            <section key={part.key} className="mt-14">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{part.title}</p>
                <p className="mt-2 text-sm text-slate-500">{part.description}</p>
              </div>
              <div className="space-y-5">
                {items.map((item) => (
                  <CurriculumCard
                    key={item.slug}
                    item={item}
                    canAccess={canAccessItem(item)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <section className="mt-14 pb-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Labs</p>
            <p className="mt-2 text-sm text-slate-500">
              Scenario-based simulator work. All published labs are open for hands-on practice.
            </p>
          </div>
          <div className="space-y-5">
            {labs.map((lab) => (
              <CurriculumCard
                key={lab.slug}
                item={lab}
                canAccess={canAccessItem(lab)}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
