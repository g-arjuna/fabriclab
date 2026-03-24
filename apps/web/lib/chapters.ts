import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import matter from "gray-matter";

export type ChapterSummary = {
  slug: string;
  title: string;
};

export type ChapterDocument = ChapterSummary & {
  content: string;
  module?: string;
  level?: string;
  estimatedMinutes?: number;
  labLink?: string;
};

export type ChapterPage = {
  index: number;
  heading: string;
  shortTitle: string;
  content: string;
};

function getChaptersPath() {
  return path.join(process.cwd(), "content", "chapters");
}

function getChapterNumber(value: string): number {
  const match = value.match(/^ch(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function sanitiseEncoding(raw: string): string {
  return raw
    .replace(/—/g, "—")
    .replace(/‘/g, "\u2018")
    .replace(/’/g, "\u2019")
    .replace(/“/g, "\u201C")
    .replace(/â€/g, "\u201D")
    .replace(/×/g, "×")
    .replace(/→/g, "→")
    .replace(/â€¢/g, "•")
    .replace(/\u00e2\u0080\u0093/g, "–")
    .replace(/\u00e2\u0080\u0094/g, "—");
}

export const getChapterSummaries = cache(async (): Promise<ChapterSummary[]> => {
  try {
    const files = await readdir(getChaptersPath());
    const chapterFiles = files
      .filter((file) => file.endsWith(".mdx"))
      .sort((left, right) => {
        const chapterDelta = getChapterNumber(left) - getChapterNumber(right);
        if (chapterDelta !== 0) {
          return chapterDelta;
        }

        return left.localeCompare(right, undefined, { numeric: true });
      });

    return Promise.all(
      chapterFiles.map(async (file) => {
        const slug = file.replace(/\.mdx$/, "");

        try {
          const rawContent = await readFile(path.join(getChaptersPath(), file), "utf8");
          const sanitised = sanitiseEncoding(rawContent);
          const { data } = matter(sanitised);

          return {
            slug,
            title: typeof data.title === "string" ? data.title : slug,
          };
        } catch {
          return { slug, title: slug };
        }
      }),
    );
  } catch {
    return [];
  }
});

export const getChapterDocument = cache(async (slug: string): Promise<ChapterDocument> => {
  const rawContent = await readFile(path.join(getChaptersPath(), `${slug}.mdx`), "utf8");
  const sanitised = sanitiseEncoding(rawContent);
  const { content, data } = matter(sanitised);

  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    content,
    module: typeof data.module === "string" ? data.module : undefined,
    level: typeof data.level === "string" ? data.level : undefined,
    estimatedMinutes:
      typeof data.estimatedMinutes === "number" ? data.estimatedMinutes : undefined,
    labLink: typeof data.labLink === "string" ? data.labLink : undefined,
  };
});

export function splitIntoPages(content: string): ChapterPage[] {
  const lines = content.split("\n");
  const pages: ChapterPage[] = [];
  let currentLines: string[] = [];
  let currentHeading = "Introduction";
  let pageIndex = 0;

  for (const line of lines) {
    if (line.startsWith("## ") && currentLines.length > 0) {
      pages.push({
        index: pageIndex,
        heading: currentHeading,
        shortTitle: makeShortTitle(currentHeading),
        content: currentLines.join("\n").trim(),
      });
      pageIndex++;
      currentHeading = line.replace(/^## /, "").trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0 || pages.length === 0) {
    pages.push({
      index: pageIndex,
      heading: currentHeading,
      shortTitle: makeShortTitle(currentHeading),
      content: currentLines.join("\n").trim(),
    });
  }

  if (pages.length >= 2) {
    const firstPageText = pages[0].content.replace(/\s+/g, " ").trim();
    if (firstPageText.length < 150) {
      const merged: ChapterPage = {
        index: 0,
        heading: pages[1].heading,
        shortTitle: pages[1].shortTitle,
        content: `${pages[0].content}\n\n${pages[1].content}`.trim(),
      };
      pages.splice(0, 2, merged);
      pages.forEach((page, index) => {
        page.index = index;
      });
    }
  }

  return pages;
}

function makeShortTitle(heading: string): string {
  return (
    heading
      .replace(/^Act\s+\d+\s*[—–-]+\s*/i, "")
      .replace(/^Chapter\s+\d+[\s:]+/i, "")
      .trim() || heading
  );
}

export async function getChapterPage(
  slug: string,
  pageIndex: number,
): Promise<{ page: ChapterPage; totalPages: number; document: ChapterDocument } | null> {
  try {
    const document = await getChapterDocument(slug);
    const pages = splitIntoPages(document.content);
    const page = pages[pageIndex];

    if (!page) {
      return null;
    }

    return { page, totalPages: pages.length, document };
  } catch {
    return null;
  }
}
