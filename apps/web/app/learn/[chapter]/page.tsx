import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { AuthControls } from "@/components/auth/AuthControls";
import { ChapterSidebar } from "@/components/chapter/ChapterSidebar";
import { CommunityThread } from "@/components/community/CommunityThread";
import { PageProgressMarker } from "@/components/chapter/PageProgressMarker";
import { AuthRequiredContentShell } from "@/components/catalog/AuthRequiredContentShell";
import { getServerViewer } from "@/lib/auth/server";
import { getCatalogAccessState, getCurriculumCatalog } from "@/lib/catalog/runtime";
import { getChapterDocument, getChapterPage, splitIntoPages } from "@/lib/chapters";
import { mdxComponents } from "@/lib/mdxComponents";

type Props = {
  params: Promise<{ chapter: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function ChapterPage({ params, searchParams }: Props) {
  const { chapter } = await params;
  const { page: pageParam } = await searchParams;
  const pageIndex = Math.max(0, Number.parseInt(pageParam ?? "0", 10) || 0);
  const viewer = await getServerViewer();
  const accessState = await getCatalogAccessState("chapter", chapter, viewer);

  if (!accessState.item || (!accessState.isPublished && !viewer.isAdmin)) {
    notFound();
  }

  if (!accessState.canAccess) {
    const nextPath = pageIndex > 0 ? `/learn/${chapter}?page=${pageIndex}` : `/learn/${chapter}`;
    return (
      <AuthRequiredContentShell
        item={accessState.item}
        kind="chapter"
        nextPath={nextPath}
      />
    );
  }

  const result = await getChapterPage(chapter, pageIndex);
  if (!result) {
    notFound();
  }

  const { page, totalPages, document } = result;
  const { chapters: catalogChapters } = await getCurriculumCatalog(viewer);
  const sidebarChapters = catalogChapters.map((item) => ({ slug: item.slug, title: item.title }));
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
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              href="/curriculum"
              className="font-mono text-sm uppercase tracking-[0.28em] text-cyan-400 transition hover:text-cyan-300"
            >
              FABRICLAB
            </Link>
            <span className="text-slate-700">/</span>
            <span className="max-w-[170px] truncate text-sm text-slate-400 sm:max-w-[240px]">
              {document.title}
            </span>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
            {document.labLink ? (
              <Link
                href={document.labLink}
                className="flex-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-center text-xs text-cyan-400 transition hover:border-cyan-500/50 hover:text-cyan-300 sm:flex-none"
              >
                Open lab
              </Link>
            ) : (
              <Link
                href="/lab"
                className="flex-1 rounded-full border border-white/20 px-4 py-1.5 text-center text-xs text-slate-400 transition hover:border-white/40 hover:text-slate-300 sm:flex-none"
              >
                Open lab
              </Link>
            )}
            <AuthControls compact />
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <ChapterSidebar
          allChapters={sidebarChapters}
          currentChapter={chapter}
          allPages={allPages}
          currentPageIndex={pageIndex}
          chapterPageCounts={chapterPageCounts}
        />

        <div className="min-w-0 lg:pt-2">
          <PageProgressMarker chapterSlug={chapter} pageIndex={pageIndex} />

          {pageIndex === 0 ? (
            <div className="mb-10 md:mb-12">
              <h1 className="max-w-5xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
                {document.title}
              </h1>
              <div className="mt-5 flex flex-wrap gap-3">
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
            <div className="mb-10 md:mb-12">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-600">
                {document.title} / Part {pageIndex + 1} of {totalPages}
              </p>
              <h2 className="mt-3 max-w-5xl text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
                {page.heading}
              </h2>
            </div>
          )}

          <div className="mb-6 lg:hidden">
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-600">
              Jump to section
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {allPages.map((chapterPage, index) => (
                <Link
                  key={chapterPage.index}
                  href={`/learn/${chapter}?page=${index}`}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
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

          <div className="rounded-[28px] border border-white/8 bg-slate-950/22 px-4 py-5 shadow-[0_18px_46px_rgba(2,6,23,0.18)] sm:px-8 sm:py-8 md:px-9 md:py-9">
            <div
              className="chapter-prose prose prose-invert max-w-none
                prose-headings:font-semibold prose-headings:tracking-tight
                prose-h2:mb-5 prose-h2:mt-12 prose-h2:text-[1.6rem] sm:prose-h2:text-[1.95rem]
                prose-h3:mb-4 prose-h3:mt-10 prose-h3:text-[1.2rem] sm:prose-h3:text-[1.35rem]
                prose-p:mb-6 prose-p:text-[0.98rem] prose-p:leading-[1.85] prose-p:text-slate-300 sm:prose-p:mb-7 sm:prose-p:text-[1rem] sm:prose-p:leading-[1.95]
                prose-li:max-w-[88ch] prose-li:text-[0.96rem] prose-li:leading-[1.8] prose-li:text-slate-300 sm:prose-li:text-[0.98rem] sm:prose-li:leading-[1.9]
                prose-ul:my-8 prose-ul:space-y-3 prose-ol:my-8 prose-ol:space-y-3
                prose-strong:text-slate-100
                prose-blockquote:my-8 prose-blockquote:border-l prose-blockquote:border-cyan-500/30 prose-blockquote:pl-5 prose-blockquote:text-slate-300
                prose-code:rounded prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.92em] prose-code:text-cyan-300
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

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {hasPrev ? (
                <Link
                  href={`/learn/${chapter}?page=${pageIndex - 1}`}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm transition hover:border-white/20 sm:w-auto"
                >
                  <span className="text-slate-500">{"\u2190"}</span>
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
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm transition hover:border-white/20 hover:border-cyan-500/30 sm:ml-auto sm:w-auto"
                >
                  <div className="text-right">
                    <p className="text-xs text-slate-600">Next</p>
                    <p className="mt-0.5 font-medium text-slate-300">
                      {allPages[pageIndex + 1]?.shortTitle}
                    </p>
                  </div>
                  <span className="text-cyan-400">{"\u2192"}</span>
                </Link>
              ) : document.labLink ? (
                <Link
                  href={document.labLink}
                  className="flex w-full items-center gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-4 text-sm transition hover:border-cyan-500/50 sm:ml-auto sm:w-auto"
                >
                  <div className="text-right">
                    <p className="text-xs text-cyan-600">Chapter complete</p>
                    <p className="mt-0.5 font-medium text-cyan-300">Open the lab environment</p>
                  </div>
                  <span className="text-cyan-400">{"\u2192"}</span>
                </Link>
              ) : (
                <Link
                  href="/curriculum"
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm transition hover:border-white/20 sm:ml-auto sm:w-auto"
                >
                  <div className="text-right">
                    <p className="text-xs text-slate-600">Chapter complete</p>
                    <p className="mt-0.5 font-medium text-slate-300">Back to curriculum</p>
                  </div>
                  <span className="text-slate-400">{"\u2192"}</span>
                </Link>
              )}
            </div>
          </div>

          <CommunityThread contentKind="chapter" contentSlug={chapter} title={document.title} />
        </div>
      </div>
    </main>
  );
}
