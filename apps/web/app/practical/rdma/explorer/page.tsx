import type { Metadata } from "next";

import { PublicTopNav } from "@/components/layout/PublicTopNav";
import { RdmaPractical } from "@/components/practical/RdmaPractical";

export const metadata: Metadata = {
  title: "Advanced RDMA execution explorer · FabricLab",
  description: "Synchronized replay and evidence inspection for the validated Soft-RoCE reference execution.",
};

type ExplorerPageProps = {
  searchParams: Promise<{ experiment?: string }>;
};

export default async function RdmaExplorerPage({ searchParams }: ExplorerPageProps) {
  const { experiment } = await searchParams;
  return (
    <main className="min-h-screen overflow-x-clip bg-[#020617] text-slate-100">
      <PublicTopNav ctaHref="/practical" ctaLabel="Practical overview" />
      <div className="mx-auto max-w-[1680px] px-3 py-5 sm:px-5 sm:py-7 xl:px-8">
        <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-4 sm:p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Advanced execution explorer</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Synchronized replay of the verified reference execution</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            This explorer preserves the experiment-by-experiment evidence replay for users who already understand the learning path. For the guided first-principles curriculum, start at the main practical page.
          </p>
        </div>
        <RdmaPractical initialExperiment={experiment} />
      </div>
    </main>
  );
}
