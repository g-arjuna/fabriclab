import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PublicTopNav } from "@/components/layout/PublicTopNav";
import { RdmaCurriculum } from "@/components/practical/RdmaCurriculum";

export const metadata: Metadata = {
  title: "RDMA From First Principles · FabricLab",
  description: "Understand how data moves from application memory, across a network, into another computer’s memory — and how RDMA changes that journey.",
};

type RdmaPracticalPageProps = {
  searchParams: Promise<{ experiment?: string; lesson?: string }>;
};

export default async function RdmaPracticalPage({ searchParams }: RdmaPracticalPageProps) {
  const { experiment, lesson } = await searchParams;

  if (experiment) {
    redirect(`/practical/rdma/explorer?experiment=${encodeURIComponent(experiment)}`);
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[#020617] text-slate-100">
      <PublicTopNav ctaHref="/practical" ctaLabel="Practical overview" />
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
        <RdmaCurriculum initialLesson={lesson} />
      </div>
    </main>
  );
}
