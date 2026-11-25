import Link from "next/link";
import type { Metadata } from "next";

import { PublicTopNav } from "@/components/layout/PublicTopNav";

export const metadata: Metadata = {
  title: "Practical labs · FabricLab",
  description: "Understand how application data moves across real systems and real networks through guided practicals.",
};

export default function PracticalPage() {
  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <PublicTopNav ctaHref="/practical/rdma" ctaLabel="Start learning" />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Practical demonstrations</p>
        <header className="mt-6 max-w-4xl">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">RDMA From First Principles</h1>
          <p className="mt-6 text-xl leading-9 text-slate-200">
            Understand how data moves from an application’s memory, across a network, into another computer’s memory — and discover how RDMA changes that journey.
          </p>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-400">
            You will work with two Linux servers, follow data through their networking systems, examine real Python programs and inspect genuine RoCEv2 packet captures. No previous RDMA programming experience is required.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/practical/rdma" className="rounded-full bg-cyan-300 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100">
              Start learning
            </Link>
            <Link href="/practical/rdma/explorer" className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-400 transition hover:border-white/25 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              Open advanced execution explorer
            </Link>
          </div>
        </header>

        <section className="mt-14 border-t border-white/8 pt-8">
          <h2 className="text-xl font-semibold text-white">How the practical teaches</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="font-medium text-cyan-100">Understand</h3>
              <p className="mt-2 text-sm leading-7 text-slate-400">Follow one continuous memory-to-memory journey. Each new mechanism appears when the previous mechanism cannot answer the current question.</p>
            </div>
            <div>
              <h3 className="font-medium text-cyan-100">Inspect</h3>
              <p className="mt-2 text-sm leading-7 text-slate-400">Open the exact Python lines, memory metadata, queue state or packet field when it explains the state you are examining.</p>
            </div>
            <div>
              <h3 className="font-medium text-cyan-100">Reproduce</h3>
              <p className="mt-2 text-sm leading-7 text-slate-400">Use the preserved lab source, evidence bundle, packet captures and advanced execution explorer when you are ready for full technical depth.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
