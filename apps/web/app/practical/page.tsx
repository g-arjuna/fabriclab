import Link from "next/link";
import type { Metadata } from "next";

import { PublicTopNav } from "@/components/layout/PublicTopNav";
import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";

export const metadata: Metadata = {
  title: "Practical labs · FabricLab",
  description: "Evidence-driven practical networking demonstrations built from real code and real packets.",
};

export default function PracticalPage() {
  const packetCount = rdmaEvidence.experiments.reduce((total, experiment) => total + experiment.packets.length, 0);
  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <PublicTopNav ctaHref="/practical/rdma" ctaLabel="Open RDMA practical" />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Practical demonstrations</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Learn protocols from running code and packets that really happened
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              FabricLab practicals connect application source, system state, network packets and completion semantics in one guided replay. The first demonstration follows a small Python RDMA program all the way to genuine RoCEv2 frames on the wire.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
              <div className="text-2xl font-semibold text-white">4</div>
              <div className="mt-1 text-sm text-slate-400">guided experiments</div>
            </div>
            <div className="rounded-[1.5rem] border border-cyan-400/25 bg-cyan-400/10 p-4">
              <div className="text-2xl font-semibold text-cyan-100">{packetCount}</div>
              <div className="mt-1 text-sm text-cyan-100/75">decoded RoCEv2 packets</div>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-400/25 bg-emerald-400/10 p-4">
              <div className="text-2xl font-semibold text-emerald-100">pass</div>
              <div className="mt-1 text-sm text-emerald-100/75">reference validation</div>
            </div>
          </div>
        </header>

        <section className="mt-12 overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] shadow-[0_28px_100px_rgba(2,6,23,0.45)]">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_0.75fr] lg:p-10">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">First practical</span>
                <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-300">Interactive replay of a verified execution</span>
              </div>
              <h2 className="mt-5 text-3xl font-semibold text-white">RDMA From First Principles</h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                From Python objects to queue pairs, work requests, RoCEv2 headers, remote memory mutation and completion queue entries. Explore resources, SEND/RECEIVE, one-sided RDMA WRITE and RDMA READ using the validated Soft-RoCE reference run.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/practical/rdma" className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
                  Start with RDMA WRITE
                </Link>
                <Link href="/practical/rdma?experiment=resources" className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/25 hover:text-white">
                  Begin with resources
                </Link>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">The learning chain</div>
              <ol className="mt-4 space-y-3">
                {[
                  "Python/Pyverbs source",
                  "PD, MR, CQ and QP resources",
                  "Work request posted to a QP",
                  "RoCEv2 packet on UDP/4791",
                  "Remote memory access",
                  "Local completion and verification",
                ].map((item, index) => (
                  <li key={item} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-900/65 p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 font-mono text-xs text-cyan-200">{index + 1}</span>
                    <span className="text-sm text-slate-200">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5">
            <h3 className="font-semibold text-white">Evidence first</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Displayed packet values are exported from validated captures and event logs. They are not copied into components as teaching placeholders.</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5">
            <h3 className="font-semibold text-white">Control and data planes separated</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">See exactly which metadata uses TCP and which payload bytes cross the RDMA data network.</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5">
            <h3 className="font-semibold text-white">Built for network engineers</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">No prior RDMA application experience required. Terms are introduced progressively with packet-level detail available when you want it.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
