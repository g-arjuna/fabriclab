import Link from "next/link";

import type { CatalogItem } from "@/lib/catalog/source";

type CurriculumCardProps = {
  item: CatalogItem;
  canAccess: boolean;
};

function Tag({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-slate-400">
      {children}
    </span>
  );
}

function AccessBadge({ item, canAccess }: { item: CatalogItem; canAccess: boolean }) {
  if (canAccess) {
    return (
      <>
        <span className="rounded-full bg-green-950 px-3 py-1 text-xs text-green-400">
          {item.durationLabel}
        </span>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-green-400">
          Available
        </span>
      </>
    );
  }

  return (
    <>
      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
        {item.durationLabel}
      </span>
      <span className="rounded-full bg-amber-950 px-3 py-1 text-xs text-amber-300">
        Sign in required
      </span>
    </>
  );
}

export function CurriculumCard({ item, canAccess }: CurriculumCardProps) {
  return (
    <Link
      href={item.href}
      className={`group rounded-[1.75rem] border p-5 transition sm:p-6 ${
        canAccess
          ? "border-white/8 bg-slate-900/80 hover:border-white/20"
          : "border-amber-500/15 bg-slate-900/90 hover:border-amber-400/30"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-slate-950/70 text-2xl font-semibold text-slate-500 sm:h-16 sm:w-16 sm:text-3xl">
          {item.number}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white sm:text-2xl">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <AccessBadge item={item} canAccess={canAccess} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>

          <div
            className={`mt-5 inline-flex items-center gap-2 text-sm transition ${
              canAccess
                ? "text-slate-400 group-hover:text-slate-200"
                : "text-amber-300/80 group-hover:text-amber-200"
            }`}
          >
            <span>{canAccess ? "Open item" : "Sign in to unlock"}</span>
            <span>{"->"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
