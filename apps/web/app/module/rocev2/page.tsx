import { readdir } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";

import { lab1 } from "@/data/labs/lab1-pfc-fix";
import { lab2 } from "@/data/labs/lab2-congestion";

const labs = [lab1, lab2];

function excerpt(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 100);
}

export default async function Rovev2ModulePage() {
  const chaptersPath = path.join(process.cwd(), "content", "chapters");
  let chapters: string[] = [];

  try {
    const files = await readdir(chaptersPath);
    chapters = files
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => file.replace(/\.mdx$/, ""));
  } catch {
    chapters = [];
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#020617_100%)] px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">FabricLab module</p>
          <h1 className="mt-5 text-4xl font-semibold text-white">
            RoCEv2 + Lossless Ethernet
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Learn to configure and troubleshoot RoCEv2 fabrics through interactive CLI simulation.
          </p>
        </header>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold text-white">Labs</h2>
            <Link href="/module/rocev2/lab" className="text-sm text-cyan-300 transition hover:text-cyan-200">
              Go to Lab Environment
            </Link>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {labs.map((lab) => (
              <Link
                key={lab.id}
                href={`/module/rocev2/lab?lab=${lab.id}`}
                className="group rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30 transition hover:border-cyan-400/50 hover:bg-slate-950"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold text-white">{lab.title}</h3>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium capitalize text-slate-300 ring-1 ring-white/10">
                    {lab.difficulty}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {excerpt(lab.scenario)}
                  {lab.scenario.length > 100 ? "..." : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold text-white">Chapters</h2>
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30">
            {chapters.length > 0 ? (
              <ul className="space-y-4">
                {chapters.map((chapter) => (
                  <li key={chapter}>
                    <Link
                      href={`/module/rocev2/${chapter}`}
                      className="text-base text-cyan-300 transition hover:text-cyan-200"
                    >
                      {chapter}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">Chapters are being prepared.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
