import Link from "next/link";

import { AuthControls } from "@/components/auth/AuthControls";
import type { CatalogItem, CatalogKind } from "@/lib/catalog/source";

type AuthRequiredContentShellProps = {
  item: CatalogItem;
  kind: CatalogKind;
  nextPath: string;
};

function Tag({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-slate-400">
      {children}
    </span>
  );
}

function getBackHref(kind: CatalogKind) {
  return kind === "chapter" ? "/curriculum" : "/lab";
}

function getBackLabel(kind: CatalogKind) {
  return kind === "chapter" ? "Back to curriculum" : "Back to labs";
}

function getEyebrow(kind: CatalogKind) {
  return kind === "chapter" ? "Sign in to read this chapter" : "Sign in to open this lab";
}

function getBody(kind: CatalogKind) {
  return kind === "chapter"
    ? "FabricLab now requires sign-in before opening chapter content so progress, discussion, and learning state stay attributable to one account."
    : "FabricLab now requires sign-in before entering lab environments so simulator progress, troubleshooting notes, and discussion stay tied to one account.";
}

function getLoginHref(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

export function AuthRequiredContentShell({
  item,
  kind,
  nextPath,
}: AuthRequiredContentShellProps) {
  const backHref = getBackHref(kind);
  const backLabel = getBackLabel(kind);

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <nav className="sticky top-0 z-40 border-b border-white/8 bg-[#020617]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href={backHref}
              className="font-mono text-sm uppercase tracking-[0.28em] text-cyan-400 transition hover:text-cyan-300"
            >
              FABRICLAB
            </Link>
            <span className="text-slate-700">/</span>
            <span className="max-w-[220px] truncate text-sm text-slate-400 sm:max-w-[280px]">
              {item.title}
            </span>
          </div>
          <AuthControls compact />
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{getEyebrow(kind)}</p>
        <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">{item.title}</h1>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            {item.durationLabel}
          </span>
          {item.partTitle ? (
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
              {item.partTitle}
            </span>
          ) : null}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
          <section className="rounded-[1.9rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 sm:p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              What you&apos;ll get after sign-in
            </p>
            <p className="mt-5 text-base leading-8 text-slate-300">
              {item.previewSummary || item.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5">
              <p className="text-sm leading-7 text-cyan-100">{getBody(kind)}</p>
            </div>
          </section>

          <aside className="rounded-[1.9rem] border border-white/10 bg-[#020b16] p-6 shadow-2xl shadow-slate-950/40 sm:p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Continue</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">Use your FabricLab account</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Sign in with Google or GitHub. We&apos;ll send you back to this exact{" "}
              {kind === "chapter" ? "chapter page" : "lab"} after authentication.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href={getLoginHref(nextPath)}
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Sign in to continue
              </Link>
              <Link
                href={backHref}
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                {backLabel}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
