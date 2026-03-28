import Link from "next/link";

import { AuthControls } from "@/components/auth/AuthControls";
import type { CatalogItem } from "@/lib/catalog/source";

type ChapterPreviewShellProps = {
  item: CatalogItem;
  hasPaidEntitlement: boolean;
};

function Tag({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-slate-400">
      {children}
    </span>
  );
}

export function ChapterPreviewShell({
  item,
  hasPaidEntitlement,
}: ChapterPreviewShellProps) {
  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <nav className="sticky top-0 z-40 border-b border-white/8 bg-[#020617]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/curriculum"
              className="font-mono text-sm uppercase tracking-[0.28em] text-cyan-400 transition hover:text-cyan-300"
            >
              FABRICLAB
            </Link>
            <span className="text-slate-700">/</span>
            <span className="max-w-[240px] truncate text-sm text-slate-400">
              {item.title}
            </span>
          </div>
          <AuthControls compact />
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
          Chapter preview
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">{item.title}</h1>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            {item.durationLabel}
          </span>
          <span className="rounded-full bg-amber-950 px-3 py-1 text-xs text-amber-300">
            Paid chapter
          </span>
          {item.partTitle ? (
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
              {item.partTitle}
            </span>
          ) : null}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              What this chapter covers
            </p>
            <p className="mt-5 text-base leading-8 text-slate-300">
              {item.previewSummary || item.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
              <p className="text-sm leading-7 text-amber-100">
                The full lesson stays hidden until paid access is granted. This preview only exposes
                catalog metadata, not chapter body content.
              </p>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-[#020b16] p-8 shadow-2xl shadow-slate-950/40">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Access
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              {hasPaidEntitlement ? "Refresh access" : "Unlock the full chapter"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              {hasPaidEntitlement
                ? "This account already has paid entitlement. If this page still appears, refresh the session or re-open the chapter."
                : "Sign in to sync progress and use a paid entitlement-enabled account to open the full lesson and related labs."}
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href={hasPaidEntitlement ? item.href : "/login"}
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                {hasPaidEntitlement ? "Re-open chapter" : "Sign in"}
              </Link>
              <Link
                href="/curriculum"
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                Back to curriculum
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
