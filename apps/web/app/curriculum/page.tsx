import Link from "next/link";

import { CurriculumCard } from "@/components/catalog/CurriculumCard";
import { PublicTopNav } from "@/components/layout/PublicTopNav";
import { getServerViewer } from "@/lib/auth/server";
import { getCurriculumCatalog, groupChaptersByPart } from "@/lib/catalog/runtime";
import { PARTS, type CatalogItem } from "@/lib/catalog/source";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function canAccessItem(item: CatalogItem, hasSession: boolean, authEnabled: boolean) {
  return !authEnabled || hasSession;
}

export default async function CurriculumPage() {
  const viewer = await getServerViewer();
  const authEnabled = isSupabaseConfigured();
  const hasSession = !!viewer.user || viewer.isAdmin;
  const { chapters, labs } = await getCurriculumCatalog(viewer);
  const chaptersByPart = groupChaptersByPart(chapters);

  const overviewCards = [
    { value: `${chapters.length}`, label: "chapters mapped" },
    { value: `${labs.length}`, label: "labs ready to launch" },
    { value: hasSession ? "Synced" : "Guest", label: hasSession ? "progress active" : "public browsing mode" },
  ];

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <PublicTopNav ctaHref="/lab" ctaLabel="Open labs" />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <header className="grid gap-6 lg:grid-cols-[1fr_0.78fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Learning path</p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              HPC networking from hardware to routed AI fabrics
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-300 sm:text-lg">
              Browse the full path in public. Sign in to open chapters and labs, sync progress, and
              participate in the technical discussion.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3">
            {overviewCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[1.6rem] border border-white/10 bg-slate-900/70 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.35)]"
              >
                <p className="text-2xl font-semibold text-white">{card.value}</p>
                <p className="mt-2 text-sm text-slate-400">{card.label}</p>
              </div>
            ))}
          </div>
        </header>

        {!authEnabled ? (
          <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-slate-900/70 p-5 text-sm leading-7 text-slate-300">
            Supabase is not configured in this environment yet, so the app is running in local mode.
            Add the environment values from{" "}
            <code className="rounded bg-slate-950 px-1.5 py-0.5 text-cyan-300">apps/web/.env.example</code>{" "}
            to enable sign-in, synced progress, and admin release controls.
          </div>
        ) : null}

        {PARTS.map((part) => {
          const items = chaptersByPart[part.key] ?? [];
          if (items.length === 0) {
            return null;
          }

          return (
            <section key={part.key} className="mt-14 sm:mt-16">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{part.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{part.description}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-slate-400">
                  {items.length} chapter{items.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {items.map((item) => (
                  <CurriculumCard
                    key={item.slug}
                    item={item}
                    canAccess={canAccessItem(item, hasSession, authEnabled)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <section className="mt-14 pb-8 sm:mt-16">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Labs</p>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                Scenario-based simulator work. Sign in to launch a lab and keep your troubleshooting
                progress attached to one account.
              </p>
            </div>
            <Link
              href="/community"
              className="inline-flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200"
            >
              Need help choosing where to start?
              <span>{"->"}</span>
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {labs.map((lab) => (
              <CurriculumCard
                key={lab.slug}
                item={lab}
                canAccess={canAccessItem(lab, hasSession, authEnabled)}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
