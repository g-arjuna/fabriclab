import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { AuthControls } from "@/components/auth/AuthControls";
import { ChapterSidebar } from "@/components/chapter/ChapterSidebar";
import { PageProgressMarker } from "@/components/chapter/PageProgressMarker";
import { ChapterPreviewShell } from "@/components/catalog/ChapterPreviewShell";
import { getServerViewer } from "@/lib/auth/server";
import {
  getChapterDocument,
  getChapterPage,
  splitIntoPages,
} from "@/lib/chapters";
import { getCatalogAccessState, getCurriculumCatalog } from "@/lib/catalog/runtime";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { mdxComponents } from "@/lib/mdxComponents";

type Props = {
  params: Promise<{ chapter: string }>;
  searchParams: Promise<{ page?: string }>;
};

function canAccessFreeSet(accessTier: "free" | "paid", authEnabled: boolean, isAdmin: boolean, hasPaidEntitlement: boolean) {
  if (!authEnabled) {
    return true;
  }

  return isAdmin || hasPaidEntitlement || accessTier === "free";
}

export default async function ChapterPage({ params, searchParams }: Props) {
  const { chapter } = await params;
  const { page: pageParam } = await searchParams;
  const pageIndex = Math.max(0, Number.parseInt(pageParam ?? "0", 10) || 0);
  const viewer = await getServerViewer();
  const authEnabled = isSupabaseConfigured();
  const accessState = await getCatalogAccessState("chapter", chapter, viewer);

  if (!accessState.item || (!accessState.isPublished && !viewer.isAdmin)) {
    notFound();
  }

  if (!accessState.canAccess) {
    if (!accessState.shouldShowPreview) {
      notFound();
    }

    return (
      <ChapterPreviewShell
        item={accessState.item}
        hasPaidEntitlement={viewer.hasPaidEntitlement}
      />
    );
  }

  const result = await getChapterPage(chapter, pageIndex);
  if (!result) {
    notFound();
  }

  const { page, totalPages, document } = result;
  const { chapters: catalogChapters } = await getCurriculumCatalog(viewer);
  const sidebarChapters = catalogChapters
    .filter((item) =>
      canAccessFreeSet(item.accessTier, authEnabled, viewer.isAdmin, viewer.hasPaidEntitlement),
    )
    .map((item) => ({ slug: item.slug, title: item.title }));
  const hasPrev = pageIndex > 0;
  const hasNext = pageIndex < totalPages - 1;
  const allPages = splitIntoPages(document.content);
  const chapterDocuments = await Promise.all(
    sidebarChapters.map(async ({ slug }) => {
      const chapterDocument = await getChapterDocument(slug);
      return [slug, splitIntoPages(chapterDocument.content).length] as const;
    }),
  );
  const chapterPageCounts = Object.fromEntries(chapterDocuments);

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <nav className="sticky top-0 z-40 border-b border-white/8 bg-[#020617]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/curriculum"
              className="font-mono text-sm uppercase tracking-[0.28em] text-cyan-400 transition hover:text-cyan-300"
            >
              FABRICLAB
            </Link>
            <span className="text-slate-700">/</span>
            <span className="max-w-[200px] truncate text-sm text-slate-400">{document.title}</span>
          </div>
          <div className="flex items-center gap-3">
            {document.labLink ? (
              <Link
                href={document.labLink}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs text-cyan-400 transition hover:border-cyan-500/50 hover:text-cyan-300"
              >
                Open lab
              </Link>
            ) : (
              <Link
                href="/lab"
                className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-slate-400 transition hover:border-white/40 hover:text-slate-300"
              >
                Open lab
              </Link>
            )}
            <AuthControls compact />
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <ChapterSidebar
          allChapters={sidebarChapters}
          currentChapter={chapter}
          allPages={allPages}
          currentPageIndex={pageIndex}
          chapterPageCounts={chapterPageCounts}
        />

        <div className="min-w-0">
          <PageProgressMarker chapterSlug={chapter} pageIndex={pageIndex} />

          {pageIndex === 0 ? (
            <div className="mb-8">
              <h1 className="text-4xl font-semibold text-white">{document.title}</h1>
              <div className="mt-4 flex flex-wrap gap-3">
                {document.module ? (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                    {document.module}
                  </span>
                ) : null}
                {document.level ? (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                    {document.level}
                  </span>
                ) : null}
                {document.estimatedMinutes ? (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                    {document.estimatedMinutes} min read
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-600">
                {document.title} · Part {pageIndex + 1} of {totalPages}
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">{page.heading}</h2>
            </div>
          )}

          <div
            className="prose prose-invert max-w-none
              prose-headings:font-semibold
              prose-h2:mb-4 prose-h2:mt-10 prose-h2:text-2xl
              prose-h3:mt-8 prose-h3:text-xl
              prose-p:text-slate-300 prose-p:leading-8
              prose-strong:text-slate-200
              prose-code:rounded prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-cyan-300
              prose-pre:border prose-pre:border-white/10 prose-pre:bg-slate-900
              prose-table:text-sm
              prose-th:text-slate-300 prose-td:text-slate-400
              prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline"
          >
            <MDXRemote
              source={page.content}
              components={mdxComponents}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>

          <div className="mt-16 border-t border-white/8 pt-8">
            <div className="mb-6">
              <div className="mb-2 flex justify-between text-xs text-slate-600">
                <span>
                  Part {pageIndex + 1} of {totalPages}
                </span>
                <span>{Math.round(((pageIndex + 1) / totalPages) * 100)}% complete</span>
              </div>
              <div className="h-1 rounded-full bg-slate-800">
                <div
                  className="h-1 rounded-full bg-cyan-400 transition-all"
                  style={{ width: `${((pageIndex + 1) / totalPages) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              {hasPrev ? (
                <Link
                  href={`/learn/${chapter}?page=${pageIndex - 1}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm transition hover:border-white/20"
                >
                  <span className="text-slate-500">←</span>
                  <div>
                    <p className="text-xs text-slate-600">Previous</p>
                    <p className="mt-0.5 font-medium text-slate-300">
                      {allPages[pageIndex - 1]?.shortTitle}
                    </p>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {hasNext ? (
                <Link
                  href={`/learn/${chapter}?page=${pageIndex + 1}`}
                  className="ml-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm transition hover:border-white/20 hover:border-cyan-500/30"
                >
                  <div className="text-right">
                    <p className="text-xs text-slate-600">Next</p>
                    <p className="mt-0.5 font-medium text-slate-300">
                      {allPages[pageIndex + 1]?.shortTitle}
                    </p>
                  </div>
                  <span className="text-cyan-400">→</span>
                </Link>
              ) : document.labLink ? (
                <Link
                  href={document.labLink}
                  className="ml-auto flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-4 text-sm transition hover:border-cyan-500/50"
                >
                  <div className="text-right">
                    <p className="text-xs text-cyan-600">Chapter complete</p>
                    <p className="mt-0.5 font-medium text-cyan-300">Open the lab environment</p>
                  </div>
                  <span className="text-cyan-400">→</span>
                </Link>
              ) : (
                <Link
                  href="/curriculum"
                  className="ml-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm transition hover:border-white/20"
                >
                  <div className="text-right">
                    <p className="text-xs text-slate-600">Chapter complete</p>
                    <p className="mt-0.5 font-medium text-slate-300">Back to curriculum</p>
                  </div>
                  <span className="text-slate-400">→</span>
                </Link>
              )}
            </div>

            <div className="mt-8 lg:hidden">
              <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-600">
                Jump to section
              </p>
              <div className="flex flex-wrap gap-2">
                {allPages.map((chapterPage, index) => (
                  <Link
                    key={chapterPage.index}
                    href={`/learn/${chapter}?page=${index}`}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      index === pageIndex
                        ? "bg-slate-700 text-slate-200"
                        : "bg-slate-900 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {index + 1}. {chapterPage.shortTitle}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
