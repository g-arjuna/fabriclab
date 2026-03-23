"use client";

import Link from "next/link";

import type { ChapterPage, ChapterSummary } from "@/lib/chapters";
import { useProgressStore } from "@/store/progressStore";

interface Props {
  allChapters: ChapterSummary[];
  currentChapter: string;
  allPages: ChapterPage[];
  currentPageIndex: number;
  chapterPageCounts: Record<string, number>;
}

export function ChapterSidebar({
  allChapters,
  currentChapter,
  allPages,
  currentPageIndex,
  chapterPageCounts,
}: Props) {
  const completedPages = useProgressStore((state) => state.completedPages);
  const getChapterProgress = useProgressStore((state) => state.getChapterProgress);

  const isPageComplete = (pageIndex: number) =>
    (completedPages[currentChapter] ?? []).includes(pageIndex);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-20">
        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-600">Chapters</p>
        <ul className="mb-8 space-y-2">
          {allChapters.map(({ slug, title }) => {
            const progress = getChapterProgress(slug, chapterPageCounts[slug] ?? 0);
            const isCurrent = slug === currentChapter;

            return (
              <li key={slug}>
                <Link
                  href={`/learn/${slug}`}
                  className={`block rounded-xl px-3 py-2 text-sm transition ${
                    isCurrent
                      ? "bg-cyan-500/10 text-cyan-300"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {title}
                </Link>
                {progress > 0 ? (
                  <div className="mx-3 mt-1 h-0.5 rounded-full bg-slate-800">
                    <div
                      className="h-0.5 rounded-full bg-cyan-400/50 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-600">
          In this chapter
        </p>
        <ul className="space-y-1">
          {allPages.map((page, index) => (
            <li key={page.index}>
              <Link
                href={`/learn/${currentChapter}?page=${index}`}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs leading-5 transition ${
                  index === currentPageIndex
                    ? "bg-slate-800 text-slate-200"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {isPageComplete(index) ? (
                  <span className="flex-shrink-0 text-cyan-400">✓</span>
                ) : (
                  <span className="flex-shrink-0 text-slate-700">{index + 1}.</span>
                )}
                {page.shortTitle}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
