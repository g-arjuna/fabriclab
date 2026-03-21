import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { mdxComponents } from "@/lib/mdxComponents";

type ChapterPageProps = {
  params: Promise<{ chapter: string }>;
};

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { chapter } = await params;
  const filePath = path.join(process.cwd(), "content", "chapters", `${chapter}.mdx`);

  try {
    const rawContent = await readFile(filePath, "utf8");
    const { content, data } = matter(rawContent);

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#020617_100%)] px-6 py-16">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-slate-950/70 p-10 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <Link href="/module/rocev2" className="text-sm text-cyan-300 transition hover:text-cyan-200">
            Back to module
          </Link>
          <h1 className="mt-6 text-4xl font-semibold text-white">
            {typeof data.title === "string" ? data.title : chapter}
          </h1>
          <div className="prose prose-invert mt-10 max-w-none">
            <MDXRemote
              source={content}
              components={mdxComponents}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>
        </div>
      </main>
    );
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#07111f_0%,#020617_100%)] px-6 py-16">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-10 text-center shadow-2xl shadow-slate-950/40 backdrop-blur">
          <h1 className="text-3xl font-semibold text-white">Chapter not found</h1>
          <Link href="/module/rocev2" className="mt-6 inline-flex text-cyan-300 transition hover:text-cyan-200">
            Return to /module/rocev2
          </Link>
        </div>
      </main>
    );
  }
}
