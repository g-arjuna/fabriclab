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
        Unavailable
      </span>
    </>
  );
}

export function CurriculumCard({ item, canAccess }: CurriculumCardProps) {
  return (
    <Link
      href={item.href}
      className={`group flex items-start gap-5 rounded-2xl border p-5 transition ${
        canAccess
          ? "border-white/8 bg-slate-900 hover:border-white/20"
          : "border-amber-500/15 bg-slate-900/90 hover:border-amber-400/30"
      }`}
    >
      <div className="min-w-14 text-4xl font-semibold leading-none text-slate-700">
        {item.number}
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold text-white">{item.title}</h3>
          <AccessBadge item={item} canAccess={canAccess} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-400">{item.description}</p>
      </div>
      <div
        className={`pt-1 text-2xl transition ${
          canAccess
            ? "text-slate-600 group-hover:text-slate-300"
            : "text-amber-400/70 group-hover:text-amber-300"
        }`}
      >
        →
      </div>
    </Link>
  );
}
