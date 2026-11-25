import type { Metadata } from "next";

import { PublicTopNav } from "@/components/layout/PublicTopNav";
import { RdmaPractical } from "@/components/practical/RdmaPractical";

export const metadata: Metadata = {
  title: "RDMA From First Principles · FabricLab",
  description: "Follow real Python RDMA code to genuine RoCEv2 packets, remote memory and completions in a validated Soft-RoCE reference run.",
};

type RdmaPracticalPageProps = {
  searchParams: Promise<{ experiment?: string }>;
};

export default async function RdmaPracticalPage({ searchParams }: RdmaPracticalPageProps) {
  const { experiment } = await searchParams;
  return (
    <main className="min-h-screen overflow-x-clip bg-[#020617] text-slate-100">
      <PublicTopNav ctaHref="/practical/rdma?experiment=write" ctaLabel="Replay WRITE" />
      <div className="mx-auto max-w-[1680px] px-3 py-5 sm:px-5 sm:py-7 xl:px-8">
        <RdmaPractical initialExperiment={experiment} />
      </div>
    </main>
  );
}
