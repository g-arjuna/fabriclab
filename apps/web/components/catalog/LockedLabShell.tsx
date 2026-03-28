import Link from "next/link";

import { AuthControls } from "@/components/auth/AuthControls";
import type { CatalogItem } from "@/lib/catalog/source";

type LockedLabShellProps = {
  item: CatalogItem;
  hasSession: boolean;
};

export function LockedLabShell({ item, hasSession }: LockedLabShellProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#020617_100%)] text-slate-100">
      <header className="border-b border-white/8 bg-[#07111f]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/curriculum"
              className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400 transition hover:text-slate-200"
            >
              {"<- Curriculum"}
            </Link>
            <span className="text-sm font-semibold text-white">{item.title}</span>
          </div>
          <AuthControls compact />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Lab unavailable</p>
            <h1 className="mt-4 text-4xl font-semibold text-white">{item.title}</h1>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {item.durationLabel}
              </span>
              <span className="rounded-full bg-amber-950 px-3 py-1 text-xs text-amber-300">
                Release staging
              </span>
            </div>
            <p className="mt-8 text-base leading-8 text-slate-300">
              {item.previewSummary || item.description}
            </p>
            <div className="mt-8 rounded-2xl border border-white/8 bg-[#020b16] p-5">
              <p className="text-sm leading-7 text-slate-400">
                This route is currently being held back from public access. Use the admin release
                controls to publish the lab when the simulator and supporting chapter are ready.
              </p>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Next step</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              {hasSession ? "Return after release" : "Sign in for context"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              {hasSession
                ? "This lab is currently held back for release staging. Return once it is published, or keep working through the open curriculum."
                : "Sign in to sync progress or check release state, then return once the lab is published."}
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href={hasSession ? "/lab" : "/login"}
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                {hasSession ? "Back to labs" : "Sign in"}
              </Link>
              <Link
                href={`/learn/${item.sourceChapterSlug}`}
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                Open source chapter
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
